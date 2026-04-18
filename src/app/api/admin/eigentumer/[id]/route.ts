import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const ownerTypeEnum = z.enum([
  'Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige',
] as const)

const patchSchema = z.object({
  name:        z.string().min(2).max(200).trim().optional(),
  type:        ownerTypeEnum.optional(),
  street:      z.string().max(200).trim().nullable().optional(),
  postal_code: z.string().max(10).trim().nullable().optional(),
  city:        z.string().max(100).trim().nullable().optional(),
  email:       z.string().email().max(200).trim().nullable().optional(),
  phone:       z.string().max(50).trim().nullable().optional(),
  tax_id:      z.string().max(50).trim().nullable().optional(),
})

// GET /api/admin/eigentumer/[id] — owner detail + linked properties
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params
  const client = serviceClient()

  const { data: owner, error } = await client
    .from('owners')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !owner) {
    return NextResponse.json({ error: 'Eigentümer nicht gefunden' }, { status: 404 })
  }

  const { data: properties } = await client
    .from('properties')
    .select('id, object_number, name, city, is_active')
    .eq('owner_id', id)
    .order('object_number', { ascending: true })

  return NextResponse.json({ owner, properties: properties ?? [] })
}

// PATCH /api/admin/eigentumer/[id] — update owner stammdaten
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
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 })
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('owners')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Eigentümer nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ owner: data })
}

// DELETE /api/admin/eigentumer/[id] — delete owner (blocked if linked properties)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id } = await params
  const client = serviceClient()

  const { count, error: countError } = await client
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', id)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 })
  }

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Eigentümer kann nicht gelöscht werden — ${count} Objekt${count !== 1 ? 'e' : ''} noch verknüpft.`,
      },
      { status: 409 },
    )
  }

  const { error } = await client.from('owners').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
