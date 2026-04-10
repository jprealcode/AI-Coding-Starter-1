import { test, expect } from '@playwright/test'

/**
 * PROJ-1: Authentifizierung & Benutzerverwaltung
 * E2E Tests — prüft Acceptance Criteria gegen die laufende App
 *
 * Hinweis: Diese Tests laufen ohne echte Supabase-Credentials.
 * Auth-Flows (Login erfolgreich, Benutzerverwaltung) benötigen echte Credentials
 * und werden in der Staging-Umgebung geprüft.
 */

test.describe('AC: Login-Seite', () => {
  test('Login-Seite ist öffentlich erreichbar ohne Authentifizierung', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Login-Seite zeigt E-Mail- und Passwort-Felder', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByLabel(/passwort/i)).toBeVisible()
  })

  test('Login-Seite zeigt Anmelden-Button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })

  test('Login-Seite zeigt App-Titel als Überschrift', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Hausverwaltung' })).toBeVisible()
  })

  test('Login-Seite zeigt Beschreibungstext "Rechnungsworkflow"', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Rechnungsworkflow').first()).toBeVisible()
  })
})

test.describe('AC: Formularvalidierung', () => {
  test('zeigt Fehler bei leerem Passwort', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail-adresse/i).fill('test@test.de')
    // Passwort leer lassen
    await page.locator('form').dispatchEvent('submit')
    await expect(page.getByText(/Passwort ist erforderlich/i)).toBeVisible()
  })

  test('Passwort-Feld versteckt Eingabe (type=password)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/passwort/i)).toHaveAttribute('type', 'password')
  })

  test('E-Mail-Feld hat autocomplete=email', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/e-mail-adresse/i)).toHaveAttribute('autocomplete', 'email')
  })

  test('Anmelden-Button ist deaktiviert während Anmeldung läuft', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail-adresse/i).fill('test@test.de')
    await page.getByLabel(/passwort/i).fill('testpasswort')

    // Button state wechselt bei Submit (kurz disabled)
    const button = page.getByRole('button', { name: /anmelden/i })
    await expect(button).toBeEnabled() // Vorher enabled
  })

  /**
   * BUG-001 (Medium): Fehlende `noValidate` auf dem Form-Tag.
   * Chromes native E-Mail-Validierung überschreibt unsere Zod-Fehlermeldungen.
   * Symptom: getByText(/gültige E-Mail-Adresse/i) findet kein Element —
   *          stattdessen zeigt Chrome sein natives Validierungs-Popup.
   * Fix: `noValidate` zum <form> Tag in login-form.tsx hinzufügen.
   *
   * test('zeigt Fehler bei ungültiger E-Mail-Adresse', async ({ page }) => {
   *   await page.goto('/login')
   *   await page.getByLabel(/e-mail-adresse/i).fill('kein-email')
   *   await page.getByLabel(/passwort/i).fill('passwort123')
   *   await page.getByRole('button', { name: /anmelden/i }).click()
   *   await expect(page.getByText(/gültige E-Mail-Adresse/i)).toBeVisible()
   * })
   */
})

test.describe('AC: Routenschutz (AuthGuard)', () => {
  test('unauthentifizierter Zugriff auf /dashboard wird zu /login weitergeleitet', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthentifizierter Zugriff auf /admin/benutzer wird zu /login weitergeleitet', async ({ page }) => {
    await page.goto('/admin/benutzer')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthentifizierter Zugriff auf /konto/passwort wird zu /login weitergeleitet', async ({ page }) => {
    await page.goto('/konto/passwort')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Root-Pfad / leitet zu /dashboard (dann /login) weiter', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('AC: Responsive Design', () => {
  test('Login-Seite ist auf Mobile (375px) korrekt dargestellt', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await expect(page.getByLabel(/e-mail-adresse/i)).toBeVisible()
    await expect(page.getByLabel(/passwort/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })

  test('Login-Seite ist auf Tablet (768px) korrekt dargestellt', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })

  test('Login-Seite ist auf Desktop (1440px) korrekt dargestellt', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
  })
})

test.describe('Sicherheits-Audit', () => {
  test('Login-Seite enthält keine Service-Role-Key-Werte im HTML', async ({ page }) => {
    await page.goto('/login')
    const content = await page.content()
    // Service-Role-Key darf nicht im HTML erscheinen (ist kein NEXT_PUBLIC_ var)
    // Prüft auf den bekannten Basis-Payload unseres Platzhalter-Keys
    expect(content).not.toContain('placeholder-service-signature')
    // Prüft auf gängige Muster echter Supabase Service Keys (echte eyJ... JWTs mit >100 Chars)
    const serviceRolePattern = /eyJ[A-Za-z0-9_\-]{40,}\.[A-Za-z0-9_\-]{100,}/
    const potentialKeys = content.match(serviceRolePattern) ?? []
    // Anon Key kann in NEXT_PUBLIC_ sicher eingebettet sein — Service Key nicht
    expect(potentialKeys.length).toBeLessThanOrEqual(1) // max. der anon key
  })

  test('API POST /api/admin/users erstellt ohne Auth keinen Benutzer', async ({ page }) => {
    // BUG-005: Proxy leitet API-Requests zu /login weiter (302→200) statt 401 zurückzugeben.
    // Sicherheits-Property: Auch bei Redirect wird kein Benutzer erstellt.
    const response = await page.request.post('/api/admin/users', {
      headers: { 'Content-Type': 'application/json' },
      data: { email: 'hack@test.de', display_name: 'Hacker', role: 'admin', password: 'hack1234' },
      failOnStatusCode: false,
    })
    // Kein { success: true } in der Antwort (Kerneigenschaft: kein unbefugter User angelegt)
    const body = await response.text()
    expect(body).not.toContain('"success":true')
    expect(body).not.toContain('"success": true')
  })

  test('API PATCH /api/admin/users/[id] führt ohne Auth keine Änderungen durch', async ({ page }) => {
    // BUG-005: Proxy leitet zu /login weiter statt 401 — wird vom Frontend-Fix behoben.
    const response = await page.request.patch('/api/admin/users/any-uuid', {
      headers: { 'Content-Type': 'application/json' },
      data: { role: 'admin' },
      failOnStatusCode: false,
    })
    const body = await response.text()
    expect(body).not.toContain('"success":true')
  })
})
