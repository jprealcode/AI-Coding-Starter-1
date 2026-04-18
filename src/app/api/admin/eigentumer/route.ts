import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const ownerTypeEnum = z.enum([
  'Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige',
] as const)

const createSchema = z.object({
  name:        z.string().min(2).max(200).trim(),
  type:        ownerTypeEnum,
  street:      z.string().max(200).trim().nullable().optional(),
  postal_code: z.string().max(10).trim().nullable().optional(),
  city:        z.string().max(100).trim().nullable().optional(),
  email:       z.string().email().max(200).trim().nullable().optional(),
  phone:       z.string().max(50).trim().nullable().optional(),
  tax_id:      z.string().max(50).trim().nullable().optional(),
})

// GET /api/admin/eigentumer — list all owners with property count
export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const client = serviceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = client
    .from('owners')
    .select('*, properties(count)')
    .order('name', { ascending: true })
    .limit(500)

  if (q.trim()) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owners = (data ?? []).map((o: any) => ({
    ...o,
    property_count: (o.properties as Array<{ count: number }> | null)?.[0]?.count ?? 0,
    properties: undefined,
  }))

  return NextResponse.json({ owners })
}

// POST /api/admin/eigentumer — create new owner
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('owners')
    .insert({
      name:        parsed.data.name,
      type:        parsed.data.type,
      street:      parsed.data.street ?? null,
      postal_code: parsed.data.postal_code ?? null,
      city:        parsed.data.city ?? null,
      email:       parsed.data.email ?? null,
      phone:       parsed.data.phone ?? null,
      tax_id:      parsed.data.tax_id ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    { owner: { ...data, property_count: 0 } },
    { status: 201 },
  )
}
