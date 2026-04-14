import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/google-auth'
import { serviceClient } from '@/lib/require-admin'

export const maxDuration = 60

// GET /api/cron/gmail — Called by Vercel Cron every 15 minutes
export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = serviceClient()

  // Check if Gmail is enabled and Google is connected
  const { data: settings } = await db.from('source_settings').select('*').single()
  if (!settings?.google_connected || !settings?.gmail_enabled) {
    return NextResponse.json({ skipped: true, reason: 'Gmail nicht aktiviert oder nicht verbunden' })
  }

  // Check polling interval — skip if too soon
  if (settings.gmail_last_synced) {
    const intervalMs = settings.gmail_polling_interval * 60 * 1000
    const lastSync = new Date(settings.gmail_last_synced).getTime()
    if (Date.now() - lastSync < intervalMs) {
      return NextResponse.json({ skipped: true, reason: 'Polling-Intervall noch nicht erreicht' })
    }
  }

  const oauthClient = await getAuthenticatedClient()
  if (!oauthClient) {
    return NextResponse.json({ error: 'Google nicht verbunden' }, { status: 400 })
  }

  const gmail = google.gmail({ version: 'v1', auth: oauthClient })
  let processed = 0
  let skipped = 0
  let errors = 0

  try {
    // List messages with PDF attachments not yet labeled "Verarbeitet"
    const { data: listData } = await gmail.users.messages.list({
      userId: 'me',
      q: 'has:attachment filename:pdf -label:Verarbeitet',
      maxResults: 50,
    })

    const messages = listData.messages ?? []

    // Get or create "Verarbeitet" label
    const labelId = await getOrCreateLabel(gmail)

    for (const msgRef of messages) {
      if (!msgRef.id) continue

      try {
        const { data: message } = await gmail.users.messages.get({
          userId: 'me',
          id: msgRef.id,
          format: 'full',
        })

        const parts = message.payload?.parts ?? []
        let labelApplied = false

        for (const part of parts) {
          if (part.mimeType !== 'application/pdf' || !part.body?.attachmentId) continue

          const { data: attachment } = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: msgRef.id,
            id: part.body.attachmentId,
          })

          if (!attachment.data) continue

          const buffer = Buffer.from(attachment.data, 'base64url')
          const hash = createHash('sha256').update(buffer).digest('hex')
          const externalId = `gmail:${msgRef.id}:${part.partId ?? part.filename}`

          // Skip if already processed (by hash or external ID)
          const { data: byHash } = await db
            .from('invoices')
            .select('id')
            .eq('sha256_hash', hash)
            .maybeSingle()
          const { data: byExtId } = await db
            .from('invoices')
            .select('id')
            .eq('external_id', externalId)
            .maybeSingle()

          if (byHash || byExtId) {
            skipped++
            continue
          }

          // Upload to Supabase Storage
          const invoiceId = crypto.randomUUID()
          const now = new Date()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const filename = part.filename || `gmail-${Date.now()}.pdf`
          const storagePath = `${now.getFullYear()}/${month}/${invoiceId}/${filename}`

          const { error: storageErr } = await db.storage
            .from('invoices')
            .upload(storagePath, buffer, { contentType: 'application/pdf' })

          if (storageErr) {
            console.error('[cron/gmail] Storage upload error:', storageErr)
            errors++
            continue
          }

          // Create invoice record
          const { error: dbErr } = await db.from('invoices').insert({
            id: invoiceId,
            source: 'gmail',
            status: 'neu',
            original_filename: filename,
            file_size: buffer.length,
            storage_path: storagePath,
            sha256_hash: hash,
            external_id: externalId,
          })

          if (dbErr) {
            await db.storage.from('invoices').remove([storagePath])
            console.error('[cron/gmail] DB insert error:', dbErr)
            errors++
            continue
          }

          processed++
          labelApplied = true
        }

        // Label entire message as "Verarbeitet" after all attachments processed
        if (labelApplied && labelId) {
          await gmail.users.messages.modify({
            userId: 'me',
            id: msgRef.id,
            requestBody: { addLabelIds: [labelId] },
          })
        }
      } catch (msgErr) {
        console.error(`[cron/gmail] Error processing message ${msgRef.id}:`, msgErr)
        errors++
      }
    }

    // Update last_synced timestamp
    await db
      .from('source_settings')
      .update({ gmail_last_synced: new Date().toISOString() })

    return NextResponse.json({ processed, skipped, errors })
  } catch (err) {
    console.error('[cron/gmail] Fatal error:', err)
    return NextResponse.json({ error: 'Cron-Job fehlgeschlagen' }, { status: 500 })
  }
}

async function getOrCreateLabel(gmail: ReturnType<typeof google.gmail>) {
  try {
    const { data } = await gmail.users.labels.list({ userId: 'me' })
    const existing = data.labels?.find((l) => l.name === 'Verarbeitet')
    if (existing?.id) return existing.id

    const { data: newLabel } = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: 'Verarbeitet',
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    })
    return newLabel.id ?? null
  } catch {
    return null
  }
}
