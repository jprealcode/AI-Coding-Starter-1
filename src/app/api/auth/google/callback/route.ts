import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { exchangeCodeForTokens, createOAuth2Client } from '@/lib/google-auth'
import { serviceClient } from '@/lib/require-admin'
import { google } from 'googleapis'

// GET /api/auth/google/callback — Handle Google OAuth2 callback
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/admin/einstellungen?error=oauth_abgebrochen', request.url)
    )
  }

  // Verify CSRF state token
  const cookieState = request.cookies.get('oauth_state')?.value
  if (!state || !cookieState || state !== cookieState) {
    console.error('[OAuth callback] CSRF state mismatch')
    return NextResponse.redirect(
      new URL('/admin/einstellungen?error=oauth_fehlgeschlagen', request.url)
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Keine Tokens erhalten — refresh_token fehlt')
    }

    // Get account email from Google
    const auth = createOAuth2Client()
    auth.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth })
    const { data: userInfo } = await oauth2.userinfo.get()

    const db = serviceClient()

    // Upsert tokens (singleton row)
    await db.from('google_oauth_tokens').upsert(
      {
        singleton: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expiry_date!).toISOString(),
        scope: tokens.scope ?? '',
        account_email: userInfo.email!,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'singleton' }
    )

    // Update source_settings
    await db.from('source_settings').update({
      google_connected: true,
      google_email: userInfo.email,
      updated_at: new Date().toISOString(),
    })

    const successResponse = NextResponse.redirect(
      new URL('/admin/einstellungen?success=verbunden', request.url)
    )
    successResponse.cookies.delete('oauth_state')
    return successResponse
  } catch (err) {
    console.error('[OAuth callback]', err)
    return NextResponse.redirect(
      new URL('/admin/einstellungen?error=oauth_fehlgeschlagen', request.url)
    )
  }
}
