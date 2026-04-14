import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAuthUrl } from '@/lib/google-auth'
import { serviceClient } from '@/lib/require-admin'

// GET /api/auth/google — Redirect to Google OAuth consent screen
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  // Generate CSRF state token — stored in HttpOnly cookie, verified in callback
  const state = crypto.randomUUID()
  const url = getAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  return response
}

// DELETE /api/auth/google — Disconnect Google account
export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const db = serviceClient()

  await db.from('google_oauth_tokens').delete().eq('singleton', true)

  await db.from('source_settings').update({
    google_connected: false,
    google_email: null,
    gmail_enabled: false,
    drive_enabled: false,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
