'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, AlertCircle, Pencil, Trash2, Star, StarOff, Plus, X } from 'lucide-react'
import type { Property, BankAccount } from '@/lib/types'
import { isValidIBAN } from 'ibantools'

// ─── Stammdaten-Formular ───────────────────────────────────────────────────

const propertySchema = z.object({
  object_number: z.string().min(1, 'Pflichtfeld').max(50),
  name: z.string().min(2, 'Pflichtfeld').max(200),
  street: z.string().max(200).optional().or(z.literal('')),
  postal_code: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})
type PropertyFormData = z.infer<typeof propertySchema>

// ─── Bankverbindungs-Formular ──────────────────────────────────────────────

const bankSchema = z.object({
  iban: z
    .string()
    .min(1, 'IBAN ist erforderlich')
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine((v) => isValidIBAN(v), { message: 'Ungültige IBAN' }),
  bic: z.string().min(1, 'BIC ist erforderlich').max(11),
  account_holder: z.string().min(1, 'Kontoinhaber ist erforderlich').max(200),
  bank_name: z.string().min(1, 'Bank-Name ist erforderlich').max(200),
})
type BankFormData = z.infer<typeof bankSchema>

// ─── Props ─────────────────────────────────────────────────────────────────

interface PropertyDetailSheetProps {
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (property: Property) => void
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PropertyDetailSheet({
  property,
  open,
  onOpenChange,
  onUpdated,
}: PropertyDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(false)
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)

  const {
    register: registerProperty,
    handleSubmit: handlePropertySubmit,
    reset: resetProperty,
    formState: { errors: propertyErrors, isSubmitting: isSavingProperty },
  } = useForm<PropertyFormData>({ resolver: zodResolver(propertySchema) })

  const {
    register: registerBank,
    handleSubmit: handleBankSubmit,
    reset: resetBank,
    formState: { errors: bankErrors, isSubmitting: isSavingBank },
  } = useForm<BankFormData>({ resolver: zodResolver(bankSchema) })

  // Laden der Bankverbindungen wenn property sich ändert
  useEffect(() => {
    if (!property || !open) return
    resetProperty({
      object_number: property.object_number,
      name: property.name,
      street: property.street ?? '',
      postal_code: property.postal_code ?? '',
      city: property.city ?? '',
      notes: property.notes ?? '',
    })
    setIsEditing(false)
    setSaveError(null)
    setShowBankForm(false)
    setBankError(null)
    loadBankAccounts(property.id)
  }, [property?.id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBankAccounts(propertyId: string) {
    setIsLoadingBanks(true)
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setBankAccounts(data.bank_accounts ?? [])
      }
    } finally {
      setIsLoadingBanks(false)
    }
  }

  async function onSaveProperty(data: PropertyFormData) {
    if (!property) return
    setSaveError(null)
    const res = await fetch(`/api/admin/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        street: data.street || '',
        postal_code: data.postal_code || '',
        city: data.city || '',
        notes: data.notes || null,
      }),
    })
    if (!res.ok) {
      const body = await res.json()
      setSaveError(body.error ?? 'Fehler beim Speichern')
      return
    }
    const { property: updated } = await res.json()
    onUpdated(updated)
    setIsEditing(false)
  }

  async function onToggleActive() {
    if (!property) return
    const res = await fetch(`/api/admin/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !property.is_active }),
    })
    if (res.ok) {
      const { property: updated } = await res.json()
      onUpdated(updated)
    }
  }

  async function onAddBankAccount(data: BankFormData) {
    if (!property) return
    setBankError(null)
    const isFirst = bankAccounts.length === 0
    const res = await fetch(
      `/api/admin/properties/${property.id}/bank-accounts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, is_default: isFirst }),
      },
    )
    if (!res.ok) {
      const body = await res.json()
      setBankError(body.error ?? 'Fehler beim Hinzufügen')
      return
    }
    const { bank_account } = await res.json()
    setBankAccounts((prev) => [...prev, bank_account])
    onUpdated({ ...property, bank_account_count: (property.bank_account_count ?? 0) + 1 })
    resetBank()
    setShowBankForm(false)
  }

  async function onSetDefault(bankId: string) {
    if (!property) return
    const res = await fetch(
      `/api/admin/properties/${property.id}/bank-accounts/${bankId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      },
    )
    if (res.ok) {
      setBankAccounts((prev) =>
        prev.map((b) => ({ ...b, is_default: b.id === bankId })),
      )
    }
  }

  async function onDeleteBankAccount(bankId: string) {
    if (!property) return
    const res = await fetch(
      `/api/admin/properties/${property.id}/bank-accounts/${bankId}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      const remaining = bankAccounts.filter((b) => b.id !== bankId)
      // Wenn Standard gelöscht → ersten als neuen Standard setzen
      const deletedWasDefault = bankAccounts.find((b) => b.id === bankId)?.is_default
      if (deletedWasDefault && remaining.length > 0) {
        remaining[0].is_default = true
        await onSetDefault(remaining[0].id)
      }
      setBankAccounts(remaining)
      onUpdated({
        ...property,
        bank_account_count: Math.max(0, (property.bank_account_count ?? 1) - 1),
      })
    }
  }

  if (!property) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">
              <span className="font-mono text-slate-500 text-sm mr-2">
                {property.object_number}
              </span>
              {property.name}
            </SheetTitle>
            <Badge
              variant="outline"
              className={
                property.is_active
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-red-200 text-red-600 bg-red-50'
              }
            >
              {property.is_active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
        </SheetHeader>

        {/* ── Stammdaten ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Stammdaten</h3>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Bearbeiten
              </Button>
            )}
          </div>

          {isEditing ? (
            <form
              onSubmit={handlePropertySubmit(onSaveProperty)}
              className="space-y-3"
              noValidate
            >
              {saveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Objektnummer *</Label>
                  <Input
                    className="h-8 text-sm"
                    {...registerProperty('object_number')}
                  />
                  {propertyErrors.object_number && (
                    <p className="text-red-500 text-xs">
                      {propertyErrors.object_number.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Bezeichnung *</Label>
                  <Input className="h-8 text-sm" {...registerProperty('name')} />
                  {propertyErrors.name && (
                    <p className="text-red-500 text-xs">{propertyErrors.name.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Straße</Label>
                <Input className="h-8 text-sm" {...registerProperty('street')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PLZ</Label>
                  <Input className="h-8 text-sm" {...registerProperty('postal_code')} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ort</Label>
                  <Input className="h-8 text-sm" {...registerProperty('city')} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notiz</Label>
                <Textarea rows={2} className="text-sm" {...registerProperty('notes')} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingProperty}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSavingProperty ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Speichern'
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setSaveError(null)
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Straße</dt>
                <dd className="text-slate-700">{property.street || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">PLZ / Ort</dt>
                <dd className="text-slate-700">
                  {[property.postal_code, property.city].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              {property.notes && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-400">Notiz</dt>
                  <dd className="text-slate-700">{property.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <Separator className="my-4" />

        {/* ── Bankverbindungen ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              Bankverbindungen
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({bankAccounts.length})
              </span>
            </h3>
            {!showBankForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBankForm(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Hinzufügen
              </Button>
            )}
          </div>

          {isLoadingBanks ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Laden...
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-700">
                        {bank.iban}
                      </span>
                      {bank.is_default && (
                        <Badge
                          variant="outline"
                          className="border-indigo-200 text-indigo-600 bg-indigo-50 text-xs"
                        >
                          Standard
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bank.account_holder} · {bank.bank_name} · {bank.bic}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {!bank.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                        title="Als Standard setzen"
                        onClick={() => onSetDefault(bank.id)}
                      >
                        <StarOff className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {bank.is_default && bankAccounts.length > 1 && (
                      <Star className="h-3.5 w-3.5 text-indigo-500 mx-1" />
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          title="Löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Bankverbindung löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            IBAN {bank.iban} wird unwiderruflich gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => onDeleteBankAccount(bank.id)}
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}

              {bankAccounts.length === 0 && !showBankForm && (
                <p className="text-sm text-slate-400 py-2">
                  Noch keine Bankverbindung hinterlegt.
                </p>
              )}
            </div>
          )}

          {/* Bankverbindung hinzufügen */}
          {showBankForm && (
            <form
              onSubmit={handleBankSubmit(onAddBankAccount)}
              className="mt-3 p-3 border border-slate-200 rounded-lg space-y-3 bg-white"
              noValidate
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">
                  Neue Bankverbindung
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setShowBankForm(false)
                    resetBank()
                    setBankError(null)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {bankError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">{bankError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label className="text-xs">IBAN *</Label>
                <Input
                  className="h-8 text-sm font-mono uppercase"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  {...registerBank('iban')}
                />
                {bankErrors.iban && (
                  <p className="text-red-500 text-xs">{bankErrors.iban.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">BIC *</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="COBADEFFXXX"
                    {...registerBank('bic')}
                  />
                  {bankErrors.bic && (
                    <p className="text-red-500 text-xs">{bankErrors.bic.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kontoinhaber *</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Max Mustermann GmbH"
                    {...registerBank('account_holder')}
                  />
                  {bankErrors.account_holder && (
                    <p className="text-red-500 text-xs">
                      {bankErrors.account_holder.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Bank-Name *</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Commerzbank AG"
                  {...registerBank('bank_name')}
                />
                {bankErrors.bank_name && (
                  <p className="text-red-500 text-xs">{bankErrors.bank_name.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingBank}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSavingBank ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </div>
            </form>
          )}
        </section>

        <Separator className="my-4" />

        {/* ── Objekt deaktivieren / reaktivieren ── */}
        <section>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  property.is_active
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                }
              >
                {property.is_active ? 'Objekt deaktivieren' : 'Objekt reaktivieren'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {property.is_active
                    ? 'Objekt deaktivieren?'
                    : 'Objekt reaktivieren?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {property.is_active
                    ? 'Das Objekt erscheint nicht mehr in Dropdowns. Bestehende Rechnungen bleiben erhalten.'
                    : 'Das Objekt wird wieder in Dropdowns angezeigt.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  className={
                    property.is_active
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                  onClick={onToggleActive}
                >
                  {property.is_active ? 'Deaktivieren' : 'Reaktivieren'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </SheetContent>
    </Sheet>
  )
}
