import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidIBAN } from 'ibantools'
import { requireAdmin, serviceClient } from '@/lib/require-admin'

const VALID_OWNER_TYPES = ['Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige'] as const
type OwnerType = (typeof VALID_OWNER_TYPES)[number]

const importRowSchema = z.object({
  object_number: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(200).trim(),
  street: z.string().max(200).trim().optional(),
  postal_code: z.string().max(10).trim().optional(),
  city: z.string().max(100).trim().optional(),
  iban: z.string().trim().optional(),
  bic: z.string().trim().optional(),
  account_holder: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
  // PROJ-13: Eigentümer + Hauptverantwortlicher
  owner_name: z.string().max(200).trim().optional(),
  owner_type: z.string().trim().optional(),
  owner_street: z.string().max(200).trim().optional(),
  owner_postal_code: z.string().max(10).trim().optional(),
  owner_city: z.string().max(100).trim().optional(),
  owner_email: z.string().max(200).trim().optional(),
  owner_tax_id: z.string().max(50).trim().optional(),
  hauptverantwortlicher_email: z.string().max(200).trim().optional(),
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
  const warnings: string[] = []
  let skipped = 0

  for (const row of rows) {
    const {
      iban, bic, account_holder, bank_name,
      owner_name, owner_type, owner_street, owner_postal_code,
      owner_city, owner_email, owner_tax_id,
      hauptverantwortlicher_email,
      ...propData
    } = row

    // Server-side IBAN validation for rows that include bank data
    if (iban) {
      const normalized = iban.replace(/\s/g, '').toUpperCase()
      if (!isValidIBAN(normalized)) { skipped++; continue }
    }

    // Check for duplicate object_number
    const { data: existing } = await client
      .from('properties')
      .select('id')
      .eq('object_number', propData.object_number)
      .maybeSingle()

    let propertyId: string

    if (existing) {
      if (duplicate_mode === 'skip') { skipped++; continue }

      const { data: updated } = await client
        .from('properties')
        .update({ ...propData, notes: null })
        .eq('id', existing.id)
        .select()
        .single()

      if (!updated) { skipped++; continue }
      propertyId = updated.id
      importedProperties.push(updated)
    } else {
      const { data: inserted } = await client
        .from('properties')
        .insert({ ...propData, notes: null })
        .select()
        .single()

      if (!inserted) { skipped++; continue }
      propertyId = inserted.id
      importedProperties.push(inserted)
    }

    // Insert bank account if all required fields are present
    if (iban && bic && account_holder && bank_name) {
      const normalizedIBAN = iban.replace(/\s/g, '').toUpperCase()
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

    // ── PROJ-13: Eigentümer-Matching ────────────────────────────────────────
    if (owner_name) {
      const normalizedType: OwnerType = VALID_OWNER_TYPES.includes(owner_type as OwnerType)
        ? (owner_type as OwnerType)
        : 'Sonstige'

      // Look up existing owner by exact name match
      const { data: existingOwner } = await client
        .from('owners')
        .select('id')
        .eq('name', owner_name)
        .maybeSingle()

      let ownerId: string

      if (existingOwner) {
        ownerId = existingOwner.id
      } else {
        // Create new owner
        const { data: newOwner } = await client
          .from('owners')
          .insert({
            name: owner_name,
            type: normalizedType,
            street: owner_street || null,
            postal_code: owner_postal_code || null,
            city: owner_city || null,
            email: owner_email || null,
            tax_id: owner_tax_id || null,
          })
          .select('id')
          .single()

        if (!newOwner) {
          warnings.push(`Zeile ${propData.object_number}: Eigentümer "${owner_name}" konnte nicht angelegt werden`)
          continue
        }
        ownerId = newOwner.id
      }

      // Link owner to property
      await client
        .from('properties')
        .update({ owner_id: ownerId })
        .eq('id', propertyId)
    }

    // ── PROJ-13: Hauptverantwortlicher-Lookup ───────────────────────────────
    if (hauptverantwortlicher_email) {
      const { data: profile } = await client
        .from('profiles')
        .select('user_id')
        .eq('email', hauptverantwortlicher_email)
        .eq('is_active', true)
        .maybeSingle()

      if (profile) {
        await client
          .from('properties')
          .update({ hauptverantwortlicher_user_id: profile.user_id })
          .eq('id', propertyId)
      } else {
        warnings.push(
          `Zeile ${propData.object_number}: Hauptverantwortlicher "${hauptverantwortlicher_email}" nicht gefunden — Feld leer gelassen`,
        )
      }
    }
  }

  return NextResponse.json({
    properties: importedProperties,
    imported: importedProperties.length,
    skipped,
    warnings,
  })
}
