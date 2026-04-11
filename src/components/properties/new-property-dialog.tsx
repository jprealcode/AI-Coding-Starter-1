'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, AlertCircle } from 'lucide-react'
import type { Property } from '@/lib/types'

const schema = z.object({
  object_number: z.string().min(1, 'Objektnummer ist erforderlich').max(50),
  name: z.string().min(2, 'Bezeichnung ist erforderlich').max(200),
  street: z.string().max(200).optional().or(z.literal('')),
  postal_code: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface NewPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (property: Property) => void
}

export function NewPropertyDialog({
  open,
  onOpenChange,
  onCreated,
}: NewPropertyDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError(null)
    const res = await fetch('/api/admin/properties', {
      method: 'POST',
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
      setError(body.error ?? 'Fehler beim Erstellen')
      return
    }

    const { property } = await res.json()
    reset()
    onCreated(property)
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset()
      setError(null)
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Verwaltungsobjekt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="object_number">Objektnummer *</Label>
              <Input
                id="object_number"
                placeholder="HV-001"
                {...register('object_number')}
              />
              {errors.object_number && (
                <p className="text-red-500 text-xs">{errors.object_number.message}</p>
              )}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="name">Bezeichnung *</Label>
              <Input
                id="name"
                placeholder="Musterstraße 12, München"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="street">Straße</Label>
            <Input
              id="street"
              placeholder="Musterstraße 12"
              {...register('street')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="postal_code">PLZ</Label>
              <Input
                id="postal_code"
                placeholder="80331"
                {...register('postal_code')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ort</Label>
              <Input
                id="city"
                placeholder="München"
                {...register('city')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notiz</Label>
            <Textarea
              id="notes"
              placeholder="Interne Notizen..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstellen...
                </>
              ) : (
                'Objekt anlegen'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
