'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Profile } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Loader2, Pencil, AlertCircle } from 'lucide-react'
import { updateProfile, toggleUserActive } from '@/app/actions/auth'

const schema = z.object({
  display_name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  role: z.enum(['admin', 'approver']),
})

type FormData = z.infer<typeof schema>

interface EditUserDialogProps {
  profile: Profile
  currentUserId: string
}

export function EditUserDialog({ profile, currentUserId }: EditUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSelf = profile.user_id === currentUserId

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile.display_name,
      role: profile.role,
    },
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = await updateProfile(profile.user_id, data)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    window.location.reload()
  }

  async function handleToggleActive() {
    const result = await toggleUserActive(profile.user_id, !profile.is_active)
    if (result.error) {
      setError(result.error)
      return
    }
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
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
            <Input {...register('display_name')} />
            {errors.display_name && (
              <p className="text-red-500 text-xs">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>E-Mail</Label>
            <Input value={profile.email} disabled className="bg-slate-50 text-slate-500" />
            <p className="text-xs text-slate-400">E-Mail-Adresse kann nicht geändert werden</p>
          </div>

          <div className="space-y-1.5">
            <Label>Rolle</Label>
            <Select
              defaultValue={profile.role}
              onValueChange={(v) => setValue('role', v as 'admin' | 'approver')}
              disabled={isSelf}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approver">Freigeber (Mitarbeiter)</SelectItem>
                <SelectItem value="admin">Admin (Buchhalter)</SelectItem>
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-slate-400">Sie können Ihre eigene Rolle nicht ändern</p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            {/* Activate/Deactivate */}
            {!isSelf && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={profile.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
                  >
                    {profile.is_active ? 'Konto sperren' : 'Konto aktivieren'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {profile.is_active ? 'Konto sperren?' : 'Konto aktivieren?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {profile.is_active
                        ? `${profile.display_name} kann sich nach der Sperrung nicht mehr anmelden. Bereits zugewiesene Rechnungen bleiben erhalten.`
                        : `${profile.display_name} kann sich nach der Aktivierung wieder anmelden.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleToggleActive}
                      className={profile.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                    >
                      {profile.is_active ? 'Sperren' : 'Aktivieren'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
