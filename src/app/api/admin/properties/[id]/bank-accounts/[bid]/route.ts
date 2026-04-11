import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const patchSchema = z.object({
  is_default: z.boolean().optional(),
  bic: z.string().max(11).trim().optional(),
  account_holder: z.string().max(200).trim().optional(),
  bank_name: z.string().max(200).trim().optional(),
})

// PATCH /api/admin/properties/[id]/bank-accounts/[bid]
// Primary use: set a bank account as the default (is_default: true)
// DB trigger handles clearing other defaults automatically
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bid: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id: property_id, bid } = await params

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
    .from('bank_accounts')
    .update(parsed.data)
    .eq('id', bid)
    .eq('property_id', property_id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Bankverbindung nicht gefunden' },
      { status: 404 },
    )
  }

  return NextResponse.json({ bank_account: data })
}

// DELETE /api/admin/properties/[id]/bank-accounts/[bid]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bid: string }> },
) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const { id: property_id, bid } = await params
  const client = serviceClient()

  // Verify it exists before deleting
  const { data: existing } = await client
    .from('bank_accounts')
    .select('id')
    .eq('id', bid)
    .eq('property_id', property_id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json(
      { error: 'Bankverbindung nicht gefunden' },
      { status: 404 },
    )
  }

  const { error } = await client
    .from('bank_accounts')
    .delete()
    .eq('id', bid)
    .eq('property_id', property_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
