import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { serviceClient } from '@/lib/require-admin'
import { SourceSettingsClient, type SourceSettings } from '@/components/admin/source-settings-client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function EinstellungenPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const db = serviceClient()
  const { data: settingsRow } = await db.from('source_settings').select('*').single()

  const settings: SourceSettings = {
    googleConnected: settingsRow?.google_connected ?? false,
    googleEmail: settingsRow?.google_email ?? null,
    gmailEnabled: settingsRow?.gmail_enabled ?? false,
    gmailPollingInterval: String(settingsRow?.gmail_polling_interval ?? 15),
    driveEnabled: settingsRow?.drive_enabled ?? false,
    driveFolderId: settingsRow?.drive_folder_id ?? null,
  }

  const { success, error } = await searchParams

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
        <p className="text-slate-500 mt-1">
          Quellen für den automatischen Rechnungseingang konfigurieren
        </p>
      </div>

      {success === 'verbunden' && (
        <Alert className="mb-6 max-w-2xl border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700">
            Google-Konto erfolgreich verbunden. Gmail und Drive stehen jetzt zur Verfügung.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 max-w-2xl" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error === 'oauth_abgebrochen'
              ? 'Google-Verbindung wurde abgebrochen.'
              : 'Google-Verbindung fehlgeschlagen. Bitte erneut versuchen.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-2xl">
        <SourceSettingsClient settings={settings} />
      </div>
    </div>
  )
}
