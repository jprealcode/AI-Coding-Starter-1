import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

// POST /api/rechnungen/upload — Manual PDF upload (Admin only)
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Ungültige Formulardaten' }, { status: 400 })
  }

  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Keine Datei angegeben' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Nur PDF-Dateien erlaubt' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Datei zu groß (max. 20 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const hash = createHash('sha256').update(buffer).digest('hex')

  const db = serviceClient()

  // Duplicate check by content hash
  const { data: existing } = await db
    .from('invoices')
    .select('id, original_filename')
    .eq('sha256_hash', hash)
    .single()

  if (existing) {
    return NextResponse.json(
      {
        error: `Duplikat: Diese Datei wurde bereits als „${existing.original_filename}" gespeichert.`,
        duplicate: true,
      },
      { status: 409 }
    )
  }

  // Upload to Supabase Storage
  const invoiceId = crypto.randomUUID()
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const storagePath = `${now.getFullYear()}/${month}/${invoiceId}/${file.name}`

  const { error: storageError } = await db.storage
    .from('invoices')
    .upload(storagePath, buffer, { contentType: 'application/pdf' })

  if (storageError) {
    console.error('[upload] Storage error:', storageError)
    return NextResponse.json(
      { error: 'Speicherfehler: ' + storageError.message },
      { status: 500 }
    )
  }

  // Create invoice record
  const { data: invoice, error: dbError } = await db
    .from('invoices')
    .insert({
      id: invoiceId,
      source: 'upload',
      status: 'neu',
      original_filename: file.name,
      file_size: file.size,
      storage_path: storagePath,
      sha256_hash: hash,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    // Cleanup orphaned file on DB error
    await db.storage.from('invoices').remove([storagePath])
    console.error('[upload] DB error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
