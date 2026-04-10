# PROJ-1: Authentifizierung & Benutzerverwaltung

## Status: In Review
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- None (Basis für alle anderen Features)

## User Stories
- Als Buchhalter (Admin) möchte ich mich mit Benutzername und Passwort anmelden, um sicher auf alle Rechnungen und Funktionen zugreifen zu können.
- Als Mitarbeiter möchte ich mich mit meinen Zugangsdaten anmelden, um nur meine zugewiesenen Rechnungen zu sehen.
- Als Admin möchte ich neue Benutzer anlegen, bearbeiten und deaktivieren, um die Zugänge zentral zu verwalten.
- Als Admin möchte ich Benutzern Rollen zuweisen (Admin oder Freigeber), um Berechtigungen korrekt zu steuern.
- Als Benutzer möchte ich mein Passwort ändern können, um meine Zugangsdaten aktuell zu halten.
- Als Admin möchte ich sehen, wann ein Benutzer zuletzt aktiv war, um inaktive Accounts zu erkennen.

## Acceptance Criteria
- [ ] Login-Seite mit Benutzername/E-Mail und Passwort-Feld
- [ ] Fehleranzeige bei falschen Anmeldedaten (nicht welches Feld falsch ist)
- [ ] Session bleibt aktiv (JWT via Supabase Auth, konfigurierbare Ablaufzeit)
- [ ] Logout-Funktion vorhanden
- [ ] Admin kann Benutzer anlegen (E-Mail, Name, Rolle, initiales Passwort)
- [ ] Admin kann Benutzer deaktivieren (Login gesperrt, Daten bleiben erhalten)
- [ ] Zwei Rollen: `admin` (Buchhalter) und `approver` (Mitarbeiter/Freigeber)
- [ ] Rollenbasierter Zugriff: Admins sehen alles, Approver nur zugewiesene Rechnungen
- [ ] Passwort-Änderung durch Benutzer selbst möglich
- [ ] Passwort-Reset durch Admin möglich
- [ ] Benutzerübersicht für Admin (Name, E-Mail, Rolle, letzter Login, Status)

## Edge Cases
- Was passiert, wenn ein deaktivierter Benutzer versucht sich einzuloggen? → Fehlermeldung "Konto gesperrt, bitte Admin kontaktieren"
- Was passiert, wenn ein Benutzer Rechnungen zur Freigabe hat und deaktiviert wird? → Rechnungen bleiben zugewiesen, Admin wird benachrichtigt
- Was passiert bei mehrfach falschem Passwort? → Nach 5 Versuchen kurze Sperre (5 Minuten)
- Was passiert, wenn kein Admin mehr vorhanden ist? → Mindestens ein Admin muss immer aktiv bleiben (Validierung beim Deaktivieren)

## Technical Requirements
- Auth: Supabase Auth (E-Mail/Passwort)
- Rollen via Supabase Row Level Security (RLS) + custom claims
- Session-Handling: Supabase JWT
- Passwörter: Gehashed durch Supabase (bcrypt)
- Keine OAuth-Provider (kein Google/GitHub Login — nur interne Accounts)

---
## Tech Design (Solution Architect)

### Seitenstruktur & Komponenten
```
App
├── /login                          ← öffentlich (ohne Anmeldung erreichbar)
│   └── LoginForm
│       ├── E-Mail-Feld
│       ├── Passwort-Feld
│       ├── Anmelden-Button
│       └── Fehlermeldung-Banner
│
├── AuthGuard                       ← prüft bei JEDER Seite: angemeldet?
│   │                                 Nein → weiterleiten zu /login
│   │
│   ├── Layout (nach Login)
│   │   ├── Header
│   │   │   ├── Logo / App-Name
│   │   │   └── Benutzer-Menü (Name, Passwort ändern, Abmelden)
│   │   └── [Geschützte Seiten des Systems]
│   │
│   └── /admin/benutzer             ← nur für Rolle "admin" erreichbar
│       ├── Benutzertabelle
│       │   └── Zeilen: Name, E-Mail, Rolle, Status, letzter Login, Aktionen
│       ├── Neuer-Benutzer-Dialog
│       ├── Benutzer-Bearbeiten-Dialog
│       ├── Deaktivieren-Bestätigungs-Dialog
│       └── Passwort-Zurücksetzen-Dialog
│
└── /konto/passwort                 ← für alle angemeldeten Benutzer
    └── Passwort-Ändern-Formular
```

### Datenmodell
Supabase Auth verwaltet Anmeldedaten intern. Eine eigene `profiles`-Tabelle ergänzt Rollen und Status:

```
Profile
├── user_id      → Verknüpfung mit Supabase Auth (auth.users)
├── display_name → Anzeigename des Benutzers
├── role         → "admin" oder "approver"
├── is_active    → Konto aktiv (true) oder gesperrt (false)
└── last_seen_at → Zeitstempel des letzten Logins

Gespeichert in: Supabase PostgreSQL
Zugriffsschutz: Row Level Security (RLS) auf allen Folgetabellen
```

### Tech-Entscheidungen
| Entscheidung | Warum |
|---|---|
| Supabase Auth | Übernimmt Passwort-Hashing, JWT, Session-Verlängerung — kein eigenes Auth-System nötig |
| Eigene Profile-Tabelle | Supabase Auth speichert keine Rollen — unsere Tabelle ergänzt genau das |
| Row Level Security (RLS) | Datenbankregeln sichern auf DB-Ebene ab, dass Approver nur ihre Daten sehen |
| Next.js Middleware | Prüft bei jedem Seitenaufruf automatisch die Session — kein manuelles Absichern jeder Route |
| Rolle im JWT-Token (custom claims) | Rolle direkt im Token → kein DB-Abfrage bei jeder Berechtigungsprüfung |

### Abhängigkeiten (Pakete)
- `@supabase/ssr` — Supabase Auth für Next.js (Server-Side Rendering)
- `zod` — Formular-Validierung (bereits im Stack)
- `react-hook-form` — Formular-Handling (bereits im Stack)

## Implementation Notes (Backend)

### Datenbank
- `public.profiles` Tabelle mit RLS (Migration: `supabase/migrations/20260410001_profiles.sql`)
- `is_admin()` SECURITY DEFINER Funktion verhindert RLS-Rekursion
- DB-Trigger `trg_prevent_last_admin_deactivation` schützt den letzten Admin
- `custom_access_token_hook` bettet Rolle in JWT ein (muss in Supabase Dashboard aktiviert werden)

### API-Routen
- `POST /api/admin/users` — Benutzer anlegen (Service Role, mit Rollback)
- `PATCH /api/admin/users/[userId]` — Name/Rolle/Status ändern
- `POST /api/admin/users/[userId]` mit `action: reset-password` — Passwort zurücksetzen

### Env-Vars
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Dokumentiert in `.env.local.example`

### Tests
- 6 Integration Tests für `POST /api/admin/users` (happy path, 401, 403, 400, Rollback)

## QA Test Results

**Datum:** 2026-04-10 | **Tester:** QA Engineer (automatisiert)
**Gesamtergebnis:** ⚠️ IN REVIEW — 2 High Bugs, 3 Medium Bugs gefunden

### Acceptance Criteria — Prüfprotokoll

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Login-Seite mit E-Mail- und Passwort-Feld | ✅ PASS | E2E Test |
| 2 | Fehleranzeige bei falschen Anmeldedaten (kein Hinweis welches Feld) | ✅ PASS | Unit + E2E Test |
| 3 | Session bleibt aktiv (JWT via Supabase Auth) | ✅ PASS | Architektur korrekt |
| 4 | Logout-Funktion vorhanden | ✅ PASS | Header-Menü, Server Action |
| 5 | Admin kann Benutzer anlegen | ✅ PASS | API Route mit Rollback |
| 6 | Admin kann Benutzer deaktivieren | ⚠️ PARTIAL | BUG-001: Session bleibt gültig bis JWT-Ablauf |
| 7 | Zwei Rollen: admin / approver | ✅ PASS | DB Schema + RLS |
| 8 | Rollenbasierter Zugriff | ✅ PASS | Proxy + RLS |
| 9 | Passwort-Änderung durch Benutzer selbst | ✅ PASS | Server Action |
| 10 | Passwort-Reset durch Admin | ✅ PASS | API Route [userId] POST |
| 11 | Benutzerübersicht (Tabelle) | ✅ PASS | Admin-Seite /admin/benutzer |

### Edge Cases

| Edge Case | Status | Anmerkung |
|-----------|--------|-----------|
| Deaktivierter Benutzer → Login gesperrt | ⚠️ PARTIAL | BUG-002: Bypass wenn kein Profil vorhanden |
| Mehrfach falsches Passwort → Sperre | ✅ PASS | Supabase Auth Rate Limiting |
| Letzter Admin kann nicht deaktiviert werden | ✅ PASS | DB Trigger + API-seitige Prüfung |

### Bugs

**BUG-001** — Severity: **HIGH**
- **Titel:** Deaktivierter Benutzer behält App-Zugriff bis JWT abläuft
- **Beschreibung:** Wenn Admin einen Benutzer deaktiviert, werden bestehende aktive Sessions nicht beendet. Der Benutzer kann die App weiter nutzen bis sein JWT abläuft (Standard: 1 Stunde).
- **Schritte:** 1. Benutzer ist angemeldet. 2. Admin deaktiviert ihn. 3. Benutzer kann weiter navigieren.
- **Fix:** `toggleUserActive(false)` muss `adminClient.auth.admin.signOut(userId, { scope: 'global' })` aufrufen.

**BUG-002** — Severity: **HIGH**
- **Titel:** `is_active`-Check in Login-Form kann umgangen werden wenn kein Profil existiert
- **Beschreibung:** `if (profile && !profile.is_active)` → wenn `profile` null ist (Supabase-Auth-User ohne Profil), wird der Active-Check übersprungen und der Login durchgeführt.
- **Fix:** Fail-closed: Login blockieren wenn kein Profil existiert. `if (!profile || !profile.is_active) { signOut(); setError(...) }`

**BUG-003** — Severity: **Medium**
- **Titel:** Fehlende `noValidate` auf Login-Formular
- **Beschreibung:** Chrome's native E-Mail-Validierung überschreibt unsere Zod-Fehlermeldungen. Das custom Styling erscheint nicht, stattdessen das Browser-Popup.
- **Fix:** `<form noValidate ...>` in `login-form.tsx`

**BUG-004** — Severity: **Medium**
- **Titel:** PATCH /api/admin/users/[userId] gibt 403 für unauthentifizierte Requests (sollte 401)
- **Beschreibung:** `requireAdmin()` gibt null für beide Fälle zurück (nicht angemeldet + kein Admin). HTTP 403 (Forbidden) ist semantisch falsch für "nicht angemeldet".
- **Fix:** `requireAdmin()` unterscheidet: kein User → 401, kein Admin → 403

**BUG-005** — Severity: **Medium**
- **Titel:** Proxy leitet API-Routes bei fehlender Auth zu /login weiter statt 401 zurückzugeben
- **Beschreibung:** Unauthentifizierte Requests an `/api/*` erhalten einen 302-Redirect zu `/login`. Für programmatischen API-Zugriff ist 401 korrekt.
- **Fix:** In `proxy.ts` API-Pfade (`/api/*`) mit `401 Unauthorized` beantworten statt zu redirecten.

### Testergebnisse
- **Unit Tests:** 13/13 ✅ (`npm test`)
- **E2E Tests:** 19/19 ✅ Chromium (`npm run test:e2e -- --project=chromium`)
- **Getestete Browser:** Chromium
- **Responsive:** 375px ✅, 768px ✅, 1440px ✅
- **Sicherheits-Audit:** Service-Role-Key nicht im HTML ✅ | API ohne Auth nicht ausführbar ✅

### Produktions-Empfehlung
**❌ NICHT BEREIT** — 2 High Bugs müssen vor Deployment behoben werden (BUG-001, BUG-002).

## Deployment
_To be added by /deploy_
