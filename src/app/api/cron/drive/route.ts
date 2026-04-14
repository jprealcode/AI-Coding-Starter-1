import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/google-auth'
import { serviceClient } from '@/lib/require-admin'

export const maxDuration = 60

// GET /api/cron/drive — Called by Vercel Cron every 15 minutes
export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = serviceClient()

  // Check if Drive is enabled, connected, and folder configured
  const { data: settings } = await db.from('source_settings').select('*').single()
  if (!settings?.google_connected || !settings?.drive_enabled || !settings?.drive_folder_id) {
    return NextResponse.json({
      skipped: true,
      reason: 'Drive nicht aktiviert, nicht verbunden oder kein Ordner konfiguriert',
    })
  }

  // Check polling interval — skip if too soon
  if (settings.drive_last_synced) {
    const intervalMs = settings.gmail_polling_interval * 60 * 1000
    const lastSync = new Date(settings.drive_last_synced).getTime()
    if (Date.now() - lastSync < intervalMs) {
      return NextResponse.json({ skipped: true, reason: 'Polling-Intervall noch nicht erreicht' })
    }
  }

  const oauthClient = await getAuthenticatedClient()
  if (!oauthClient) {
    return NextResponse.json({ error: 'Google nicht verbunden' }, { status: 400 })
  }

  const drive = google.drive({ version: 'v3', auth: oauthClient })
  const folderId = settings.drive_folder_id
  let processed = 0
  let skipped = 0
  let errors = 0

  try {
    // Get or create "Verarbeitet" subfolder
    const verarbeitetFolderId = await getOrCreateVerarbeitetFolder(drive, folderId)

    // List new PDFs in the configured folder since last sync
    let q = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`
    if (settings.drive_last_synced) {
      q += ` and createdTime > '${settings.drive_last_synced}'`
    }

    const { data: fileList } = await drive.files.list({
      q,
      fields: 'files(id, name, size)',
      pageSize: 50,
    })

    for (const file of fileList.files ?? []) {
      if (!file.id) continue

      try {
        const externalId = `drive:${file.id}`

        // Skip if already processed
        const { data: existing } = await db
          .from('invoices')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Download file content
        const response = await drive.files.get(
          { fileId: file.id, alt: 'media' },
          { responseType: 'arraybuffer' }
        )
        const buffer = Buffer.from(response.data as ArrayBuffer)
        const hash = createHash('sha256').update(buffer).digest('hex')

        // Skip duplicate by hash (same content, different source)
        const { data: byHash } = await db
          .from('invoices')
          .select('id')
          .eq('sha256_hash', hash)
          .maybeSingle()

        if (byHash) {
          skipped++
          // Still move to "Verarbeitet" to clean up the folder
          if (verarbeitetFolderId) {
            await moveToVerarbeitet(drive, file.id, folderId, verarbeitetFolderId)
          }
          continue
        }

        // Upload to Supabase Storage
        const invoiceId = crypto.randomUUID()
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const filename = file.name ?? `drive-${Date.now()}.pdf`
        const storagePath = `${now.getFullYear()}/${month}/${invoiceId}/${filename}`

        const { error: storageErr } = await db.storage
          .from('invoices')
          .upload(storagePath, buffer, { contentType: 'application/pdf' })

        if (storageErr) {
          console.error('[cron/drive] Storage error:', storageErr)
          errors++
          continue
        }

        // Create invoice record
        const { error: dbErr } = await db.from('invoices').insert({
          id: invoiceId,
          source: 'drive',
          status: 'neu',
          original_filename: filename,
          file_size: buffer.length,
          storage_path: storagePath,
          sha256_hash: hash,
          external_id: externalId,
        })

        if (dbErr) {
          await db.storage.from('invoices').remove([storagePath])
          console.error('[cron/drive] DB error:', dbErr)
          errors++
          continue
        }

        // Move processed file to "Verarbeitet" subfolder
        if (verarbeitetFolderId) {
          await moveToVerarbeitet(drive, file.id, folderId, verarbeitetFolderId)
        }

        processed++
      } catch (fileErr) {
        console.error(`[cron/drive] Error processing file ${file.id}:`, fileErr)
        errors++
      }
    }

    // Update last_synced timestamp
    await db
      .from('source_settings')
      .update({ drive_last_synced: new Date().toISOString() })

    return NextResponse.json({ processed, skipped, errors })
  } catch (err) {
    console.error('[cron/drive] Fatal error:', err)
    return NextResponse.json({ error: 'Cron-Job fehlgeschlagen' }, { status: 500 })
  }
}

async function getOrCreateVerarbeitetFolder(
  drive: ReturnType<typeof google.drive>,
  parentId: string
): Promise<string | null> {
  try {
    const { data } = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='Verarbeitet' and trashed=false`,
      fields: 'files(id)',
    })

    if (data.files?.[0]?.id) return data.files[0].id

    const { data: newFolder } = await drive.files.create({
      requestBody: {
        name: 'Verarbeitet',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    })

    return newFolder.id ?? null
  } catch {
    return null
  }
}

async function moveToVerarbeitet(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  fromFolderId: string,
  toFolderId: string
) {
  await drive.files.update({
    fileId,
    addParents: toFolderId,
    removeParents: fromFolderId,
    requestBody: {},
    fields: 'id',
  })
}
