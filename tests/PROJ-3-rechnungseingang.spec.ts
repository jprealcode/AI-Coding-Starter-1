import { test, expect } from '@playwright/test'

/**
 * PROJ-3: Rechnungseingang — Quellen
 * E2E Tests — prüft Acceptance Criteria und Sicherheit
 *
 * Hinweis: Tests ohne echte Auth-Credentials prüfen Route-Schutz,
 * API-Sicherheit und UI-Struktur. Auth-abhängige Flows (Upload,
 * Google verbinden) werden in der Staging-Umgebung geprüft.
 */

// ─── Auth Guard: neue Seiten ────────────────────────────────────────────────

test.describe('Auth Guard: /rechnungen', () => {
  test('unauthentifizierter Zugriff auf /rechnungen wird zu /login weitergeleitet', async ({
    page,
  }) => {
    await page.goto('/rechnungen')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Auth Guard: /admin/einstellungen', () => {
  test('unauthentifizierter Zugriff auf /admin/einstellungen wird zu /login weitergeleitet', async ({
    page,
  }) => {
    await page.goto('/admin/einstellungen')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── API Sicherheit: Upload ──────────────────────────────────────────────────

test.describe('API Sicherheit: /api/rechnungen/upload', () => {
  test('POST /api/rechnungen/upload gibt 401 ohne Authentifizierung zurück', async ({
    request,
  }) => {
    const formData = new FormData()
    formData.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'test.pdf')
    const res = await request.post('/api/rechnungen/upload', {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
        },
      },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/rechnungen/upload gibt 401 zurück — kein Datenleck bei fehlender Auth', async ({
    request,
  }) => {
    const res = await request.post('/api/rechnungen/upload', {
      multipart: {
        file: {
          name: 'angriff.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 malicious content'),
        },
      },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    // Keine internen Fehlerdetails im Response
    expect(body.error).not.toContain('supabase')
    expect(body.error).not.toContain('database')
  })
})

// ─── API Sicherheit: Rechnungen-Liste ───────────────────────────────────────

test.describe('API Sicherheit: /api/rechnungen', () => {
  test('GET /api/rechnungen gibt 401 ohne Authentifizierung zurück', async ({ request }) => {
    const res = await request.get('/api/rechnungen')
    expect(res.status()).toBe(401)
  })

  test('GET /api/rechnungen gibt keine Rechnungsdaten ohne Auth zurück', async ({ request }) => {
    const res = await request.get('/api/rechnungen')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.invoices).toBeUndefined()
  })
})

// ─── API Sicherheit: Google OAuth ───────────────────────────────────────────

test.describe('API Sicherheit: /api/auth/google', () => {
  test('DELETE /api/auth/google gibt 401 ohne Authentifizierung zurück', async ({ request }) => {
    const res = await request.delete('/api/auth/google')
    expect(res.status()).toBe(401)
  })
})

// ─── API Sicherheit: Einstellungen ──────────────────────────────────────────

test.describe('API Sicherheit: /api/admin/settings', () => {
  test('GET /api/admin/settings gibt 401 ohne Auth zurück', async ({ request }) => {
    const res = await request.get('/api/admin/settings')
    expect(res.status()).toBe(401)
  })

  test('PUT /api/admin/settings gibt 401 ohne Auth zurück', async ({ request }) => {
    const res = await request.put('/api/admin/settings', {
      data: { pollingInterval: '15' },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── API Sicherheit: Cron-Jobs ──────────────────────────────────────────────

test.describe('AC: Cron-Job-Schutz — CRON_SECRET erforderlich', () => {
  test('GET /api/cron/gmail gibt 401 ohne Authorization-Header zurück', async ({ request }) => {
    const res = await request.get('/api/cron/gmail')
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/gmail gibt 401 bei falschem Secret zurück', async ({ request }) => {
    const res = await request.get('/api/cron/gmail', {
      headers: { Authorization: 'Bearer falsches-secret-12345' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/drive gibt 401 ohne Authorization-Header zurück', async ({ request }) => {
    const res = await request.get('/api/cron/drive')
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/drive gibt 401 bei falschem Secret zurück', async ({ request }) => {
    const res = await request.get('/api/cron/drive', {
      headers: { Authorization: 'Bearer falsches-secret-12345' },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Regression: PROJ-1 + PROJ-2 ────────────────────────────────────────────

test.describe('Regression: PROJ-1 Login-Seite', () => {
  test('Login-Seite ist weiterhin erreichbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
  })
})

test.describe('Regression: PROJ-2 API-Schutz', () => {
  test('GET /api/admin/properties gibt weiterhin 401 ohne Auth zurück', async ({ request }) => {
    const res = await request.get('/api/admin/properties')
    expect(res.status()).toBe(401)
  })
})
