'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { changePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, KeyRound } from 'lucide-react'

const schema = z
  .object({
    newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function PasswortPage() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    setSuccess(false)
    const result = await changePassword(data.newPassword)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
    reset()
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Passwort ändern</h1>
        <p className="text-slate-500 mt-1">Vergeben Sie ein neues sicheres Passwort für Ihr Konto.</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-500" />
            Neues Passwort setzen
          </CardTitle>
          <CardDescription>
            Das neue Passwort muss mindestens 8 Zeichen lang sein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {success && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Passwort wurde erfolgreich geändert.</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label>Neues Passwort</Label>
              <Input
                type="password"
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Passwort bestätigen</Label>
              <Input
                type="password"
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
