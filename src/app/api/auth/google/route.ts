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

  const url = getAuthUrl()
  return NextResponse.redirect(url)
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
