import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export type AdminResult =
  | { user: { id: string }; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse }

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 },
      ),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 },
      ),
    }
  }

  return { user }
}

export function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
