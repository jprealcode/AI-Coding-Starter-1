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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, Pencil, Building2 } from 'lucide-react'
import { OWNER_TYPES, type Owner, type OwnerType, type Property } from '@/lib/types'

const schema = z.object({
  name: z.string().min(2, 'Pflichtfeld').max(200),
  type: z.enum(['Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige'] as const),
  street: z.string().max(200).optional().or(z.literal('')),
  postal_code: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Ungültige E-Mail').max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  tax_id: z.string().max(50).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

interface EigentümerDetailSheetProps {
  owner: Owner | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (owner: Owner) => void
  onDeleted: (ownerId: string) => void
}

export function EigentümerDetailSheet({
  owner,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: EigentümerDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [linkedProperties, setLinkedProperties] = useState<Property[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const currentType = watch('type')

  useEffect(() => {
    if (!owner || !open) return
    reset({
      name: owner.name,
      type: owner.type,
      street: owner.street ?? '',
      postal_code: owner.postal_code ?? '',
      city: owner.city ?? '',
      email: owner.email ?? '',
      phone: owner.phone ?? '',
      tax_id: owner.tax_id ?? '',
    })
    setIsEditing(false)
    setSaveError(null)
    loadLinkedProperties(owner.id)
  }, [owner?.id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLinkedProperties(ownerId: string) {
    setIsLoadingProperties(true)
    try {
      const res = await fetch(`/api/admin/eigentumer/${ownerId}`)
      if (res.ok) {
        const data = await res.json()
        setLinkedProperties(data.properties ?? [])
      }
    } finally {
      setIsLoadingProperties(false)
    }
  }

  async function onSave(data: FormData) {
    if (!owner) return
    setSaveError(null)
    const res = await fetch(`/api/admin/eigentumer/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        street: data.street || null,
        postal_code: data.postal_code || null,
        city: data.city || null,
        email: data.email || null,
        phone: data.phone || null,
        tax_id: data.tax_id || null,
      }),
    })
    if (!res.ok) {
      const body = await res.json()
      setSaveError(body.error ?? 'Fehler beim Speichern')
      return
    }
    const { owner: updated } = await res.json()
    onUpdated(updated)
    setIsEditing(false)
  }

  async function onDelete() {
    if (!owner) return
    const res = await fetch(`/api/admin/eigentumer/${owner.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json()
      setSaveError(body.error ?? 'Fehler beim Löschen')
      return
    }
    onDeleted(owner.id)
    onOpenChange(false)
  }

  if (!owner) return null

  const canDelete = linkedProperties.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{owner.name}</SheetTitle>
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              {owner.type}
            </Badge>
          </div>
        </SheetHeader>

        {/* ── Stammdaten ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Stammdaten</h3>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Bearbeiten
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSave)} className="space-y-3" noValidate>
              {saveError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input className="h-8 text-sm" {...register('name')} />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Typ *</Label>
                <Select
                  value={currentType}
                  onValueChange={(v) => setValue('type', v as OwnerType)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Straße</Label>
                <Input className="h-8 text-sm" {...register('street')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PLZ</Label>
                  <Input className="h-8 text-sm" {...register('postal_code')} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ort</Label>
                  <Input className="h-8 text-sm" {...register('city')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">E-Mail</Label>
                  <Input className="h-8 text-sm" type="email" {...register('email')} />
                  {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefon</Label>
                  <Input className="h-8 text-sm" {...register('phone')} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">USt-ID / Steuernummer</Label>
                <Input className="h-8 text-sm" placeholder="DE123456789" {...register('tax_id')} />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Speichern'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setIsEditing(false); setSaveError(null) }}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Adresse</dt>
                <dd className="text-slate-700">
                  {owner.street
                    ? `${owner.street}, ${[owner.postal_code, owner.city].filter(Boolean).join(' ')}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">E-Mail</dt>
                <dd className="text-slate-700">{owner.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Telefon</dt>
                <dd className="text-slate-700">{owner.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">USt-ID / Steuernummer</dt>
                <dd className="text-slate-700">{owner.tax_id || '—'}</dd>
              </div>
            </dl>
          )}
        </section>

        <Separator className="my-4" />

        {/* ── Verknüpfte Objekte ── */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Verknüpfte Objekte
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({linkedProperties.length})
            </span>
          </h3>

          {isLoadingProperties ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Laden...
            </div>
          ) : linkedProperties.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Keine Objekte verknüpft.</p>
          ) : (
            <div className="space-y-1.5">
              {linkedProperties.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-500">{p.object_number}</span>
                  <span className="text-sm text-slate-700">{p.name}</span>
                  {p.city && (
                    <span className="text-xs text-slate-400 ml-auto">{p.city}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator className="my-4" />

        {/* ── Löschen ── */}
        <section>
          {saveError && !isEditing && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          {!canDelete && (
            <p className="text-xs text-slate-400 mb-2">
              Eigentümer kann nicht gelöscht werden, solange {linkedProperties.length} Objekt
              {linkedProperties.length !== 1 ? 'e' : ''} verknüpft {linkedProperties.length !== 1 ? 'sind' : 'ist'}.
            </p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canDelete}
                className="border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Eigentümer löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eigentümer löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  „{owner.name}" wird unwiderruflich gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={onDelete}
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </SheetContent>
    </Sheet>
  )
}
