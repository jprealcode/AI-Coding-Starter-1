# PROJ-1: Authentifizierung & Benutzerverwaltung

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
