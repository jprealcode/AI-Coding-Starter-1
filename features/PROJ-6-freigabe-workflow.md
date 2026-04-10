# PROJ-6: Freigabe-Workflow

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Rollen und User-IDs
- Requires: PROJ-5 (Dashboard) — UI für Zuweisung und Freigabe

## User Stories
- Als Buchhalter möchte ich eine Rechnung einem oder mehreren Mitarbeitern zur Freigabe zuweisen, um die Prüfung zu delegieren.
- Als Buchhalter möchte ich Rechnungen auch direkt zur Zahlung freigeben (ohne Mitarbeiter-Freigabe), wenn ich das selbst entscheide.
- Als Mitarbeiter möchte ich alle mir zugewiesenen Rechnungen übersichtlich sehen, um nichts zu übersehen.
- Als Mitarbeiter möchte ich eine Rechnung mit einem Klick freigeben und optional eine Notiz hinterlassen.
- Als Mitarbeiter möchte ich eine Rechnung mit Konflikt zurückgeben und muss dabei eine Begründung eingeben.
- Als Buchhalter möchte ich bei Konflikt-Rechnungen die Begründung sehen und entscheiden, wie weiter verfahren wird.
- Als Buchhalter möchte ich den kompletten Freigabe-Verlauf einer Rechnung einsehen (wer hat was wann entschieden).

## Acceptance Criteria
- [ ] **Zuweisung (Admin/Buchhalter):**
  - Rechnung einem oder mehreren Approvern zuweisen (Dropdown mit allen aktiven Approvern)
  - Zuweisung von mehreren Rechnungen gleichzeitig möglich (Stapelzuweisung)
  - Zugewiesen-Datum und Fälligkeitsdatum (optional) setzen
  - Direkt-Freigabe durch Buchhalter ohne Mitarbeiter-Umweg möglich
- [ ] **Freigabe durch Mitarbeiter:**
  - Schaltfläche "Freigeben" — optionale Notiz (Freitext, max. 500 Zeichen)
  - Schaltfläche "Konflikt melden" — Notiz **Pflicht** (min. 20 Zeichen)
  - Bestätigungs-Dialog vor Aktion (Zusammenfassung der Rechnung anzeigen)
- [ ] **Status-Übergänge:**
  - `Neu` → `Zugewiesen` (Buchhalter weist zu)
  - `Zugewiesen` → `Freigegeben` (Mitarbeiter gibt frei) oder `Konflikt` (Mitarbeiter meldet Konflikt)
  - `Konflikt` → `Zugewiesen` (Buchhalter weist erneut zu) oder `Abgelehnt` (Buchhalter verwirft)
  - `Freigegeben` → `Zahlung ausstehend` (automatisch nach Freigabe)
- [ ] **Audit-Trail:** Jede Status-Änderung wird mit Zeitstempel, User-ID, Aktion und Notiz protokolliert
- [ ] **Erinnerungen:** Rechnungen, die > 3 Tage zugewiesen sind ohne Reaktion, werden im Dashboard farblich hervorgehoben (konfigurierbar)
- [ ] **Benachrichtigung im Dashboard:** Mitarbeiter sehen Zähler offener Freigaben im Header
- [ ] **Freigabe-Verlauf:** Pro Rechnung: vollständige Timeline aller Aktionen (wer, wann, was, Notiz)
- [ ] **Mehrfach-Freigabe:** Wenn mehrere Approver zugewiesen, kann Buchhalter konfigurieren: alle müssen freigeben (AND) oder einer reicht (OR)

## Edge Cases
- Was passiert, wenn ein Approver deaktiviert wird und noch offene Zuweisungen hat? → Admin-Warnung, Rechnungen können neu zugewiesen werden
- Was passiert, wenn eine bereits freigegebene Rechnung nachträglich als Duplikat erkannt wird? → Admin kann Freigabe zurückziehen, Rechnung geht in `Konflikt`
- Was passiert, wenn ein Mitarbeiter eine Rechnung freigibt, ohne das PDF geöffnet zu haben? → Kein technisches Blocking, aber visueller Hinweis ("PDF noch nicht angesehen")
- Was passiert, wenn alle zugewiesenen Approver eine Rechnung ablehnen? → Status `Konflikt`, Buchhalter entscheidet endgültig
- Was passiert, wenn eine Rechnung im Konflikt-Status ist und das Fälligkeitsdatum überschritten ist? → Eskalations-Markierung (rot im Dashboard)

## Technical Requirements
- Audit-Trail: eigene Tabelle `invoice_audit_log` (unveränderlich, append-only)
- Echtzeit-Updates: Supabase Realtime für Status-Änderungen
- E-Mail-Benachrichtigung (optional, Phase 2): Supabase Functions + Resend/SendGrid

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
