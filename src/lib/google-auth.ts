import { google } from 'googleapis'
import { serviceClient } from './require-admin'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive',
  'openid',
  'email',
]

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  )
}

export function getAuthUrl() {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

/** Returns an authenticated OAuth2 client with auto-refreshed tokens, or null if not connected. */
export async function getAuthenticatedClient() {
  const db = serviceClient()
  const { data: tokenRow } = await db
    .from('google_oauth_tokens')
    .select('*')
    .single()

  if (!tokenRow) return null

  const client = createOAuth2Client()
  client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: new Date(tokenRow.expires_at).getTime(),
  })

  // Refresh if expired (or within 5 minutes of expiry)
  const expiresAt = new Date(tokenRow.expires_at).getTime()
  const fiveMinutes = 5 * 60 * 1000
  if (Date.now() + fiveMinutes >= expiresAt) {
    const { credentials } = await client.refreshAccessToken()
    await db
      .from('google_oauth_tokens')
      .update({
        access_token: credentials.access_token!,
        expires_at: new Date(credentials.expiry_date!).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('singleton', true)
    client.setCredentials(credentials)
  }

  return client
}
