import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NewUserDialog } from '@/components/users/new-user-dialog'
import { EditUserDialog } from '@/components/users/edit-user-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { type Profile } from '@/lib/types'

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default async function BenutzerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  const users = (profiles ?? []) as Profile[]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Benutzerverwaltung</h1>
          <p className="text-slate-500 mt-1">
            {users.length} Benutzer · {users.filter((u) => u.is_active).length} aktiv
          </p>
        </div>
        <NewUserDialog />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Alle Benutzer
          </CardTitle>
          <CardDescription>
            Admins haben vollen Zugriff. Freigeber sehen nur ihre zugewiesenen Rechnungen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="pl-6">Benutzer</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Letzter Login</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="pr-6 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((profile) => {
                const initials = profile.display_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <TableRow key={profile.user_id} className={!profile.is_active ? 'opacity-50' : ''}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{profile.display_name}</p>
                          <p className="text-slate-400 text-xs">{profile.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          profile.role === 'admin'
                            ? 'border-indigo-200 text-indigo-700 bg-indigo-50'
                            : 'border-slate-200 text-slate-600'
                        }
                      >
                        {profile.role === 'admin' ? 'Admin' : 'Freigeber'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          profile.is_active
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            : 'border-red-200 text-red-600 bg-red-50'
                        }
                      >
                        {profile.is_active ? 'Aktiv' : 'Gesperrt'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(profile.last_seen_at)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(profile.created_at)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <EditUserDialog profile={profile} currentUserId={user.id} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Noch keine Benutzer angelegt
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
