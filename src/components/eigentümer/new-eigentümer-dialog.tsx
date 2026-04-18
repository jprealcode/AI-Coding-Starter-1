'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { OWNER_TYPES, type Owner, type OwnerType } from '@/lib/types'

const schema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben').max(200),
  type: z.enum(['Privatperson', 'GmbH', 'AG', 'KG', 'UG', 'GbR', 'WEG', 'Sonstige'] as const),
  street: z.string().max(200).optional().or(z.literal('')),
  postal_code: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Ungültige E-Mail').max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  tax_id: z.string().max(50).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface NewEigentümerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (owner: Owner) => void
}

export function NewEigentümerDialog({ open, onOpenChange, onCreated }: NewEigentümerDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'GmbH' },
  })

  function handleClose(o: boolean) {
    if (!o) { reset(); setError(null) }
    onOpenChange(o)
  }

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      const res = await fetch('/api/admin/eigentumer', {
        method: 'POST',
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
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Fehler beim Anlegen des Eigentümers')
        return
      }
      reset()
      onCreated(result.owner)
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neuen Eigentümer anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Name *</Label>
              <Input placeholder="Müller GmbH oder Anna Schmidt" {...register('name')} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Typ *</Label>
              <Select
                defaultValue="GmbH"
                onValueChange={(v) => setValue('type', v as OwnerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Straße</Label>
            <Input placeholder="Musterstraße 12" {...register('street')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>PLZ</Label>
              <Input placeholder="20095" {...register('postal_code')} />
            </div>
            <div className="space-y-1.5">
              <Label>Ort</Label>
              <Input placeholder="Hamburg" {...register('city')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input type="email" placeholder="info@example.de" {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input placeholder="+49 40 123456" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>USt-ID / Steuernummer</Label>
            <Input placeholder="DE123456789" {...register('tax_id')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eigentümer anlegen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
