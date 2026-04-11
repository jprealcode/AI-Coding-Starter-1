import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PropertiesClient } from '@/components/properties/properties-client'
import type { Property } from '@/lib/types'

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

  const { data: rows } = await supabase
    .from('properties')
    .select('*, bank_accounts(count)')
    .order('object_number', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Property[] = (rows ?? []).map((p: any) => ({
    ...p,
    bank_account_count: (p.bank_accounts as Array<{ count: number }> | null)?.[0]?.count ?? 0,
    bank_accounts: undefined,
  }))

  return <PropertiesClient initialProperties={properties} />
}
