# PROJ-9: DATEV UNTERNEHMEN online API

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-8 (Kontierung) — Buchungssätze müssen vorhanden sein
- Requires: PROJ-7 (Zahllauf) — Rechnungen sollten bezahlt/freigegeben sein

## User Stories
- Als Buchhalter möchte ich kontierte Rechnungen direkt an DATEV UNTERNEHMEN online übertragen, um die Buchungen nicht manuell eintippen zu müssen.
- Als Buchhalter möchte ich auswählen, welche Rechnungen ich an DATEV übertrage (Stapel oder Einzeln).
- Als Admin möchte ich DATEV-Zugangsdaten und Mandantennummer in den Einstellungen hinterlegen.
- Als Buchhalter möchte ich den Übertragungsstatus für jede Rechnung sehen (ausstehend, übertragen, Fehler).
- Als Buchhalter möchte ich Buchungssätze im DATEV-Format als Vorschau sehen, bevor ich übertrage.

## Acceptance Criteria
- [ ] **DATEV-Konfiguration (Admin):**
  - DATEV UNTERNEHMEN online: OAuth2-Authentifizierung (DATEV-Login)
  - Mandantennummer, Berater-Nummer hinterlegbar
  - Verbindung testbar (Test-Ping-Schaltfläche)
- [ ] **Übertragung:**
  - Buchungssätze werden im DATEV-Buchungsstapel-Format aufbereitet
  - Übertragung per DATEV Unternehmen online API (`/datev/v1/accounting/documents`)
  - Einzelübertragung und Stapelübertragung möglich
  - Fortschrittsanzeige bei Stapeln
- [ ] **DATEV-Buchungsstapel-Felder:**
  - Belegdatum, Buchungsbetrag, Soll/Haben-Kennzeichen, Konto, Gegenkonto
  - Buchungstext (max. 60 Zeichen), Kostenstelle (Verwaltungsobjekt-Nummer), Beleg-Nummer (Rechnungsnummer)
  - MwSt-Schlüssel nach DATEV-Standard
- [ ] **Status-Tracking:**
  - Pro Rechnung: `nicht übertragen`, `übertragen` (mit Zeitstempel), `Fehler` (mit Fehlermeldung)
  - Filter in der Rechnungsliste nach DATEV-Status
- [ ] **Vorschau:** DATEV-Buchungszeilen im Format anzeigen, bevor Übertragung startet
- [ ] **Fehlerbehandlung:** DATEV-API-Fehler werden verständlich angezeigt, Retry möglich
- [ ] **Belegübertragung (optional, Phase 2):** Original-PDF als Belegdokument an DATEV anhängen

## Edge Cases
- Was passiert, wenn die DATEV-Authentifizierung abläuft? → Token-Refresh automatisch, bei Fehler Benachrichtigung
- Was passiert, wenn ein Buchungssatz von DATEV abgelehnt wird (Validierungsfehler)? → Klare Fehlermeldung mit DATEV-Fehlercode, manuelle Korrektur möglich
- Was passiert, wenn die gleiche Rechnung versehentlich zweimal übertragen wird? → DATEV-Duplikatsprüfung über Beleg-Nummer, im System Warnhinweis
- Was passiert, wenn DATEV API nicht erreichbar ist? → Fehler geloggt, Retry beim nächsten manuellen Versuch

## Technical Requirements
- DATEV UNTERNEHMEN online REST API (https://developer.datev.de)
- OAuth2 Authorization Code Flow (DATEV Identity Provider)
- Buchungsstapel-Format: DATEV ASCII oder API-spezifisches JSON
- Credentials sicher in Supabase Vault (verschlüsselt) gespeichert

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
