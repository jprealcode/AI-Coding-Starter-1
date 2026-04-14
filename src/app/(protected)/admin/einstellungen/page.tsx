import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SourceSettingsClient, type SourceSettings } from '@/components/admin/source-settings-client'

export default async function EinstellungenPage() {
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

  // Default state until /backend builds the DB tables (PROJ-3)
  const settings: SourceSettings = {
    googleConnected: false,
    googleEmail: null,
    gmailPollingInterval: '15',
    driveFolderId: null,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
        <p className="text-slate-500 mt-1">
          Quellen für den automatischen Rechnungseingang konfigurieren
        </p>
      </div>
      <div className="max-w-2xl">
        <SourceSettingsClient settings={settings} />
      </div>
    </div>
  )
}
