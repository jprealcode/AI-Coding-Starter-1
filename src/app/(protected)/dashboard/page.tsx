import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Guten Tag, {profile?.display_name?.split(' ')[0] ?? 'Benutzer'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isAdmin
            ? 'Hier ist Ihre Übersicht aller Rechnungen.'
            : 'Hier sind Ihre zur Freigabe zugewiesenen Rechnungen.'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Neue Rechnungen</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">—</div>
            <p className="text-xs text-slate-500 mt-1">Im Eingangskorb</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Ausstehend</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">—</div>
            <p className="text-xs text-slate-500 mt-1">Warten auf Freigabe</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Freigegeben</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">—</div>
            <p className="text-xs text-slate-500 mt-1">Bereit zur Zahlung</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Konflikte</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">—</div>
            <p className="text-xs text-slate-500 mt-1">Klärungsbedarf</p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for invoice list - built in PROJ-5 */}
      <Card className="border-slate-200 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-slate-500 font-medium">Noch keine Rechnungen</h3>
          <p className="text-slate-400 text-sm mt-1">
            Der Rechnungseingang wird in PROJ-3 und das Dashboard in PROJ-5 aufgebaut.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
