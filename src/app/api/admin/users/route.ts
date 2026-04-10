import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(2),
  role: z.enum(['admin', 'approver']),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    // Verify caller is authenticated and is admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
    }

    const { email, display_name, role, password } = parsed.data

    // Use service role client to create user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message ?? 'Benutzer konnte nicht erstellt werden' },
        { status: 400 }
      )
    }

    // Create profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        email,
        display_name,
        role,
        is_active: true,
        last_seen_at: null,
      })

    if (profileError) {
      // Rollback user creation
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Profil konnte nicht erstellt werden' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
