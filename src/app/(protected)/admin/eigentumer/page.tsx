import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EigentümerClient } from '@/components/eigentümer/eigentümer-client'
import type { Owner } from '@/lib/types'

export default async function EigentümerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  // owners table is created in backend phase — gracefully return empty list until then
  let owners: Owner[] = []
  try {
    const { data } = await supabase
      .from('owners')
      .select('*, properties(count)')
      .order('name', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    owners = (data ?? []).map((o: any) => ({
      ...o,
      property_count: (o.properties as Array<{ count: number }> | null)?.[0]?.count ?? 0,
      properties: undefined,
    }))
  } catch {
    // table not yet created — backend migration pending
  }

  return <EigentümerClient initialOwners={owners} />
}
