'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

export async function createUser(data: {
  email: string
  display_name: string
  role: 'admin' | 'approver'
  password: string
}) {
  const supabase = await createServerSupabaseClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht authentifiziert' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return { error: 'Keine Berechtigung' }

  // Use service role via API route for user creation
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    return { error: 'Benutzer konnte nicht erstellt werden' }
  }

  revalidatePath('/admin/benutzer')
  return { success: true }
}

export async function updateProfile(userId: string, data: {
  display_name?: string
  role?: 'admin' | 'approver'
}) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('profiles')
    .update({ ...data })
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/benutzer')
  return { success: true }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
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
