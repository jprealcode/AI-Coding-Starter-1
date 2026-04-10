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
  DialogTrigger,
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
import { Loader2, Plus, AlertCircle } from 'lucide-react'

const schema = z.object({
  display_name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  role: z.enum(['admin', 'approver']),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
})

type FormData = z.infer<typeof schema>

export function NewUserDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'approver' },
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? 'Fehler beim Erstellen des Benutzers')
        return
      }
      reset()
      setOpen(false)
      window.location.reload()
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); setError(null) } }}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Neuer Benutzer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="Maria Müller" {...register('display_name')} />
            {errors.display_name && (
              <p className="text-red-500 text-xs">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>E-Mail-Adresse</Label>
            <Input type="email" placeholder="maria@hausverwaltung.de" {...register('email')} />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Rolle</Label>
            <Select defaultValue="approver" onValueChange={(v) => setValue('role', v as 'admin' | 'approver')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approver">Freigeber (Mitarbeiter)</SelectItem>
                <SelectItem value="admin">Admin (Buchhalter)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Initiales Passwort</Label>
            <Input type="password" placeholder="Mindestens 8 Zeichen" {...register('password')} />
            {errors.password && (
              <p className="text-red-500 text-xs">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Benutzer anlegen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
