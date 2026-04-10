# PROJ-1: Authentifizierung & Benutzerverwaltung

## Status: In Progress
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
