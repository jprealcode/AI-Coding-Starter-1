import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const createSchema = z.object({
  object_number: z.string().min(1).max(50).trim(),
  name: z.string().min(2).max(200).trim(),
  street: z.string().max(200).trim().optional().default(''),
  postal_code: z.string().max(10).trim().optional().default(''),
  city: z.string().max(100).trim().optional().default(''),
  notes: z.string().max(1000).trim().nullable().optional(),
})

// GET /api/admin/properties?q=searchterm
export async function GET(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const client = serviceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = client
    .from('properties')
    .select('*, bank_accounts(count)')
    .order('object_number', { ascending: true })
    .limit(500)

  if (q.trim()) {
    query = query.or(
      `object_number.ilike.%${q}%,name.ilike.%${q}%,street.ilike.%${q}%,city.ilike.%${q}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties = (data ?? []).map((p: any) => ({
    ...p,
    bank_account_count: p.bank_accounts?.[0]?.count ?? 0,
    bank_accounts: undefined,
  }))

  return NextResponse.json({ properties })
}

// POST /api/admin/properties — create new property
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
    .from('properties')
    .insert({ ...parsed.data, notes: parsed.data.notes ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Objektnummer "${parsed.data.object_number}" existiert bereits.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(
    { property: { ...data, bank_account_count: 0 } },
    { status: 201 },
  )
}
