'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Anmeldedaten ungültig. Bitte überprüfen Sie Ihre Eingabe.')
        return
      }

      if (!authData.session) {
        setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.')
        return
      }

      // Check if user is active
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('user_id', authData.user.id)
        .single()

      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        setError('Ihr Konto ist gesperrt. Bitte kontaktieren Sie den Administrator.')
        return
      }

      // Update last_seen_at
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', authData.user.id)

      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-700">E-Mail-Adresse</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@hausverwaltung.de"
          autoComplete="email"
          className="h-11"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-red-500 text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-700">Passwort</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="h-11"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-red-500 text-xs">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Anmelden...
          </>
        ) : (
          'Anmelden'
        )}
      </Button>
    </form>
  )
}
