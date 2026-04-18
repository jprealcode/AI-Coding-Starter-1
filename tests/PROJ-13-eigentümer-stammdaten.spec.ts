import { test, expect } from '@playwright/test'

/**
 * PROJ-13: Eigentümer-Stammdaten & Objekt-Erweiterung
 * E2E Tests — Acceptance Criteria, Auth Guards, Security
 *
 * Routen: /admin/eigentumer und /api/admin/eigentumer (ASCII, ohne Umlaut)
 * Anzeigename bleibt "Eigentümer" im UI.
 */

// ─── Auth Guard: /admin/eigentumer ─────────────────────────────────────────

test.describe('Auth Guard: /admin/eigentumer', () => {
  test('leitet unauthentifizierte Benutzer zu /login weiter', async ({ page }) => {
    await page.goto('/admin/eigentumer')
    await expect(page).toHaveURL(/\/login/)
  })

  test('leitet unauthentifizierte Benutzer von /admin/objekte zu /login weiter (Regression)', async ({
    page,
  }) => {
    await page.goto('/admin/objekte')
    await expect(page).toHaveURL(/\/login/)
  })

  test('leitet unauthentifizierte Benutzer von /admin/benutzer zu /login weiter (Regression)', async ({
    page,
  }) => {
    await page.goto('/admin/benutzer')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Regression: Login-Seite (PROJ-1) ─────────────────────────────────────

test.describe('Regression: Login-Seite (PROJ-1)', () => {
  test('Login-Seite ist weiterhin erreichbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByLabel(/passwort/i)).toBeVisible()
  })

  test('Login-Formular hat noValidate', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form')).toHaveAttribute('novalidate')
  })
})

// ─── API Security: /api/admin/eigentumer ───────────────────────────────────

test.describe('API Sicherheit: /api/admin/eigentumer', () => {
  test('GET /api/admin/eigentumer gibt 401 ohne Auth zurück (kein Redirect)', async ({
    page,
  }) => {
    const res = await page.request.get('/api/admin/eigentumer')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  test('POST /api/admin/eigentumer gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.post('/api/admin/eigentumer', {
      data: { name: 'Test GmbH', type: 'GmbH' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/eigentumer/[id] gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.get('/api/admin/eigentumer/some-uuid')
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/admin/eigentumer/[id] gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.patch('/api/admin/eigentumer/some-uuid', {
      data: { name: 'Updated Name' },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/admin/eigentumer/[id] gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.delete('/api/admin/eigentumer/some-uuid')
    expect(res.status()).toBe(401)
  })

  test('POST mit gültigem Body gibt trotzdem 401 (Auth prüft vor Validierung)', async ({
    page,
  }) => {
    const res = await page.request.post('/api/admin/eigentumer', {
      data: { name: 'Müller GmbH', type: 'GmbH', email: 'info@mueller.de' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.owner).toBeUndefined()
    expect(body.owners).toBeUndefined()
  })
})

// ─── API Security: properties-Erweiterung (Regression) ────────────────────

test.describe('API Sicherheit: properties owner_id + HV (Regression)', () => {
  test('PATCH /api/admin/properties/[id] gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.patch('/api/admin/properties/some-uuid', {
      data: { owner_id: 'owner-uuid' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/properties/import gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.post('/api/admin/properties/import', {
      data: {
        rows: [{ object_number: 'HV-001', name: 'Test', owner_name: 'Test GmbH' }],
        duplicate_mode: 'skip',
      },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Regression: bestehende API-Routen ────────────────────────────────────

test.describe('Regression: PROJ-2 API-Schutz', () => {
  test('GET /api/admin/properties gibt weiterhin 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.get('/api/admin/properties')
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/properties/[id] gibt weiterhin 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.get('/api/admin/properties/some-uuid')
    expect(res.status()).toBe(401)
  })
})

test.describe('Regression: PROJ-3 API-Schutz', () => {
  test('GET /api/rechnungen gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.get('/api/rechnungen')
    expect(res.status()).toBe(401)
  })
})

// ─── Responsive: Regression ────────────────────────────────────────────────

test.describe('Responsive: Mobile Layout (Regression)', () => {
  test('Login-Seite rendert korrekt auf 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByLabel(/passwort/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })
})
