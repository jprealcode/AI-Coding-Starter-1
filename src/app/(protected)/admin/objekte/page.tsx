import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PropertiesClient } from '@/components/properties/properties-client'
import type { Property, Profile } from '@/lib/types'

export default async function ObjektePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  const [{ data: rows }, { data: profileRows }] = await Promise.all([
    supabase
      .from('properties')
      // owner:owners(*) requires the PROJ-13 migration — gracefully ignored if not yet run
      .select('*, bank_accounts(count), owner:owners(*)')
      .order('object_number', { ascending: true }),
    supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Property[] = (rows ?? []).map((p: any) => ({
    ...p,
    bank_account_count: (p.bank_accounts as Array<{ count: number }> | null)?.[0]?.count ?? 0,
    bank_accounts: undefined,
  }))

  const profiles = (profileRows ?? []) as Profile[]

  return <PropertiesClient initialProperties={properties} profiles={profiles} />
}
