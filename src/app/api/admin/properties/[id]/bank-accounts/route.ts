import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidIBAN } from 'ibantools'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const createSchema = z.object({
  iban: z
    .string()
    .min(1, 'IBAN ist erforderlich')
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine((v) => isValidIBAN(v), { message: 'Ungültige IBAN' }),
  bic: z.string().min(1, 'BIC ist erforderlich').max(11).trim(),
  account_holder: z
    .string()
    .min(1, 'Kontoinhaber ist erforderlich')
    .max(200)
    .trim(),
  bank_name: z.string().min(1, 'Bank-Name ist erforderlich').max(200).trim(),
  is_default: z.boolean().optional().default(false),
})

// POST /api/admin/properties/[id]/bank-accounts — add bank account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id: property_id } = await params
  const client = serviceClient()

  // Verify property exists
  const { data: property } = await client
    .from('properties')
    .select('id')
    .eq('id', property_id)
    .maybeSingle()

  if (!property) {
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Ungültige Eingabe'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  // First bank account for a property is always the default
  const { count } = await client
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', property_id)

  const isDefault = parsed.data.is_default || !count || count === 0

  const { data, error } = await client
    .from('bank_accounts')
    .insert({ ...parsed.data, property_id, is_default: isDefault })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ bank_account: data }, { status: 201 })
}
