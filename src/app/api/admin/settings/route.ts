import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const updateSchema = z.object({
  driveFolderId: z.string().max(200).trim().nullable().optional(),
  pollingInterval: z.enum(['15', '30', '60']).optional(),
  gmailEnabled: z.boolean().optional(),
  driveEnabled: z.boolean().optional(),
})

// GET /api/admin/settings
export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const db = serviceClient()
  const { data, error } = await db.from('source_settings').select('*').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ settings: data })
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (parsed.data.pollingInterval !== undefined) {
    updates.gmail_polling_interval = parseInt(parsed.data.pollingInterval)
  }
  if (parsed.data.driveFolderId !== undefined) {
    updates.drive_folder_id = parsed.data.driveFolderId ?? null
  }
  if (parsed.data.gmailEnabled !== undefined) {
    updates.gmail_enabled = parsed.data.gmailEnabled
  }
  if (parsed.data.driveEnabled !== undefined) {
    updates.drive_enabled = parsed.data.driveEnabled
  }

  const db = serviceClient()
  const { error } = await db.from('source_settings').update(updates)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
