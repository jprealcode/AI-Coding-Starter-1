import { test, expect } from '@playwright/test'

/**
 * PROJ-2: Verwaltungsobjekte & Stammdaten
 * E2E Tests — prüft Acceptance Criteria gegen die laufende App
 *
 * Hinweis: Die Seite /admin/objekte ist authentifizierungspflichtig.
 * Tests ohne Credentials prüfen Redirect-Verhalten und UI-Struktur.
 * Vollständige Acceptance-Criteria-Tests erfordern echte Supabase-Credentials
 * und werden in der Staging-Umgebung ausgeführt.
 */

// ─── Auth Guard ────────────────────────────────────────────────────────────

test.describe('Auth Guard: /admin/objekte', () => {
  test('leitet unauthentifizierte Benutzer zu /login weiter', async ({ page }) => {
    await page.goto('/admin/objekte')
    await expect(page).toHaveURL(/\/login/)
  })

  test('leitet unauthentifizierte Benutzer von /admin/benutzer zu /login weiter', async ({
    page,
  }) => {
    // Regression: PROJ-1 Auth Guard weiterhin aktiv
    await page.goto('/admin/benutzer')
    await expect(page).toHaveURL(/\/login/)
  })

  test('leitet unauthentifizierte Benutzer von /dashboard zu /login weiter', async ({
    page,
  }) => {
    // Regression: Alle geschützten Routen prüfen
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Regression: PROJ-1 Login-Seite ────────────────────────────────────────

test.describe('Regression: Login-Seite (PROJ-1)', () => {
  test('Login-Seite ist weiterhin erreichbar', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByLabel(/passwort/i)).toBeVisible()
  })

  test('Login-Formular hat noValidate (verhindert Browser-Validierung)', async ({ page }) => {
    await page.goto('/login')
    const form = page.locator('form')
    await expect(form).toHaveAttribute('novalidate')
  })

  test('Login-Formular zeigt Fehler bei fehlendem Passwort (Regression BUG-003)', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail-adresse/i).fill('test@test.de')
    // noValidate verhindert Browser-Popup, Zod-Fehlermeldung erscheint stattdessen
    await page.locator('form').dispatchEvent('submit')
    await expect(page.getByText(/Passwort ist erforderlich/i)).toBeVisible()
  })
})

// ─── API: Struktur der Properties-Endpunkte ────────────────────────────────

test.describe('API: /api/admin/properties Endpunkte', () => {
  test('GET /api/admin/properties gibt 401 ohne Auth zurück (kein Redirect)', async ({
    page,
  }) => {
    const res = await page.request.get('/api/admin/properties')
    // BUG-005-Fix aus PROJ-1: API-Routes geben 401, nicht 302
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/properties gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.post('/api/admin/properties', {
      data: { object_number: 'HV-001', name: 'Test' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/properties/[id] gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.get('/api/admin/properties/some-uuid')
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/properties/import gibt 401 ohne Auth zurück', async ({ page }) => {
    const res = await page.request.post('/api/admin/properties/import', {
      data: { rows: [{ object_number: 'HV-001', name: 'Test' }], duplicate_mode: 'skip' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/properties/[id]/bank-accounts gibt 401 ohne Auth zurück', async ({
    page,
  }) => {
    const res = await page.request.post(
      '/api/admin/properties/some-uuid/bank-accounts',
      {
        data: {
          iban: 'DE89370400440532013000',
          bic: 'COBADEFFXXX',
          account_holder: 'Test',
          bank_name: 'Testbank',
        },
      },
    )
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/admin/properties/[id]/bank-accounts/[bid] gibt 401 ohne Auth zurück', async ({
    page,
  }) => {
    const res = await page.request.patch(
      '/api/admin/properties/prop-uuid/bank-accounts/bank-uuid',
      { data: { is_default: true } },
    )
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/admin/properties/[id]/bank-accounts/[bid] gibt 401 ohne Auth zurück', async ({
    page,
  }) => {
    const res = await page.request.delete(
      '/api/admin/properties/prop-uuid/bank-accounts/bank-uuid',
    )
    expect(res.status()).toBe(401)
  })
})

// ─── API: Input-Validierung (ohne Auth → 401, nicht 400) ───────────────────

test.describe('API: Sicherheit — keine Daten ohne Auth', () => {
  test('POST mit gültigem Body gibt trotzdem 401 (Auth prüft vor Validierung)', async ({
    page,
  }) => {
    const res = await page.request.post('/api/admin/properties', {
      data: { object_number: 'HV-999', name: 'Angreifer-Objekt' },
    })
    // Auth wird vor Body-Parsing geprüft
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Nicht authentifiziert')
  })

  test('IBAN-Validierungs-Endpoint gibt 401 ohne Auth (kein IBAN-Leak)', async ({
    page,
  }) => {
    const res = await page.request.post(
      '/api/admin/properties/some-uuid/bank-accounts',
      {
        data: {
          iban: 'DE00000000000000000000', // ungültige IBAN
          bic: 'HACK',
          account_holder: 'Hacker',
          bank_name: 'Evil Bank',
        },
      },
    )
    expect(res.status()).toBe(401)
  })
})

// ─── Responsive: Login-Seite (Regression PROJ-1) ──────────────────────────

test.describe('Responsive: Mobile Layout (Regression)', () => {
  test('Login-Seite rendert korrekt auf 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })
})
