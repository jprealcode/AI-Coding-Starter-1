'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

export async function updateProfile(userId: string, data: {
  display_name?: string
  role?: 'admin' | 'approver'
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Keine Berechtigung' }
  if (userId === user.id && data.role !== undefined) return { error: 'Sie können Ihre eigene Rolle nicht ändern' }

  const { error } = await adminClient()
    .from('profiles')
    .update(data)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/benutzer')
  return { success: true }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Keine Berechtigung' }

  // Last-admin guard
  if (!isActive) {
    const client = adminClient()
    const { data: targetProfile } = await client
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (targetProfile?.role === 'admin') {
      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('user_id', userId)

      if (!count || count === 0) {
        return { error: 'Mindestens ein aktiver Admin muss vorhanden bleiben.' }
      }
    }
  }

  const { error } = await adminClient()
    .from('profiles')
    .update({ is_active: isActive })
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/benutzer')
  return { success: true }
}

export async function changePassword(newPassword: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}
