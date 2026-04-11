import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidIBAN } from 'ibantools'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const importRowSchema = z.object({
  object_number: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(200).trim(),
  street: z.string().max(200).trim().optional().default(''),
  postal_code: z.string().max(10).trim().optional().default(''),
  city: z.string().max(100).trim().optional().default(''),
  iban: z.string().trim().optional(),
  bic: z.string().trim().optional(),
  account_holder: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
})

const importBodySchema = z.object({
  rows: z.array(importRowSchema).min(1).max(1000),
  duplicate_mode: z.enum(['skip', 'overwrite']).default('skip'),
})

// POST /api/admin/properties/import — bulk import from Excel
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = importBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { rows, duplicate_mode } = parsed.data
  const client = serviceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importedProperties: any[] = []

  for (const row of rows) {
    const { iban, bic, account_holder, bank_name, ...propData } = row

    // Server-side IBAN validation for rows that include bank data
    if (iban) {
      const normalized = iban.replace(/\s/g, '').toUpperCase()
      if (!isValidIBAN(normalized)) continue // skip invalid IBAN rows
    }

    // Check for duplicate object_number
    const { data: existing } = await client
      .from('properties')
      .select('id')
      .eq('object_number', propData.object_number)
      .maybeSingle()

    let propertyId: string

    if (existing) {
      if (duplicate_mode === 'skip') continue

      // Overwrite: update existing property
      const { data: updated } = await client
        .from('properties')
        .update({ ...propData, notes: null })
        .eq('id', existing.id)
        .select()
        .single()

      if (!updated) continue
      propertyId = updated.id
      importedProperties.push(updated)
    } else {
      // Insert new property
      const { data: inserted } = await client
        .from('properties')
        .insert({ ...propData, notes: null })
        .select()
        .single()

      if (!inserted) continue
      propertyId = inserted.id
      importedProperties.push(inserted)
    }

    // Insert bank account if all required fields are present
    if (iban && bic && account_holder && bank_name) {
      const normalizedIBAN = iban.replace(/\s/g, '').toUpperCase()

      // First bank account for this property becomes the default
      const { count } = await client
        .from('bank_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId)

      await client.from('bank_accounts').insert({
        property_id: propertyId,
        iban: normalizedIBAN,
        bic,
        account_holder,
        bank_name,
        is_default: !count || count === 0,
      })
    }
  }

  return NextResponse.json({
    properties: importedProperties,
    imported: importedProperties.length,
  })
}
