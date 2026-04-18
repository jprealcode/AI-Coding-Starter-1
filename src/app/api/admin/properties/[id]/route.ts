import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const patchSchema = z.object({
  object_number: z.string().min(1).max(50).trim().optional(),
  name: z.string().min(2).max(200).trim().optional(),
  street: z.string().max(200).trim().optional(),
  postal_code: z.string().max(10).trim().optional(),
  city: z.string().max(100).trim().optional(),
  notes: z.string().max(1000).trim().nullable().optional(),
  is_active: z.boolean().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  hauptverantwortlicher_user_id: z.string().uuid().nullable().optional(),
})

// GET /api/admin/properties/[id] — detail with bank accounts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params
  const client = serviceClient()

  const { data, error } = await client
    .from('properties')
    .select('*, bank_accounts(*), owner:owners(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH /api/admin/properties/[id] — update fields or toggle is_active
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: 'Keine Felder zum Aktualisieren' },
      { status: 400 },
    )
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('properties')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Objektnummer bereits vergeben.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ property: data })
}
