import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

type AdminResult =
  | { user: { id: string; email?: string } }
  | { authError: 'unauthenticated' | 'forbidden' }

async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authError: 'unauthenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') return { authError: 'forbidden' }
  return { user }
}

// PATCH /api/admin/users/[userId] — update display_name and/or role
const patchSchema = z.object({
  display_name: z.string().min(2).optional(),
  role: z.enum(['admin', 'approver']).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const result = await requireAdmin()
  if ('authError' in result) {
    const status = result.authError === 'unauthenticated' ? 401 : 403
    const message = result.authError === 'unauthenticated' ? 'Nicht authentifiziert' : 'Keine Berechtigung'
    return NextResponse.json({ error: message }, { status })
  }
  const admin = result.user

  const { userId } = await params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  // Prevent self-role change
  if (userId === admin.id && parsed.data.role !== undefined) {
    return NextResponse.json({ error: 'Sie können Ihre eigene Rolle nicht ändern' }, { status: 400 })
  }

  const client = adminClient()

  // If deactivating, check at least one active admin remains (DB trigger also guards this)
  if (parsed.data.is_active === false) {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profile?.role === 'admin') {
      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('user_id', userId)

      if (!count || count === 0) {
        return NextResponse.json(
          { error: 'Mindestens ein aktiver Admin muss vorhanden bleiben.' },
          { status: 400 }
        )
      }
    }
  }

  const { error } = await client
    .from('profiles')
    .update(parsed.data)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users/[userId]/reset-password handled via POST below
// POST /api/admin/users/[userId] — reset password
const resetPasswordSchema = z.object({
  action: z.literal('reset-password'),
  newPassword: z.string().min(8),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const result = await requireAdmin()
  if ('authError' in result) {
    const status = result.authError === 'unauthenticated' ? 401 : 403
    const message = result.authError === 'unauthenticated' ? 'Nicht authentifiziert' : 'Keine Berechtigung'
    return NextResponse.json({ error: message }, { status })
  }

  const { userId } = await params
  const body = await request.json()
  const parsed = resetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  const client = adminClient()
  const { error } = await client.auth.admin.updateUserById(userId, {
    password: parsed.data.newPassword,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
