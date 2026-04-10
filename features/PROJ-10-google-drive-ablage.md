# PROJ-10: Google Drive Ablage

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-3 (Rechnungseingang) — Google Drive OAuth bereits eingerichtet
- Requires: PROJ-7 (Zahllauf) — Rechnungen werden nach Bezahlung archiviert

## User Stories
- Als Buchhalter möchte ich, dass bezahlte Rechnungen automatisch in einem konfigurierten Google Drive-Ordner abgelegt werden, um eine strukturierte digitale Ablage zu haben.
- Als Admin möchte ich die Ablage-Struktur im Google Drive konfigurieren (z.B. nach Jahr/Monat/Objekt), um eine sinnvolle Ordnerstruktur zu erzwingen.
- Als Buchhalter möchte ich, dass der abgelegte Dateiname strukturiert ist (z.B. Datum_Lieferant_Betrag_Rechnungsnummer), um Dateien schnell zu finden.
- Als Buchhalter möchte ich den Google Drive-Ablage-Link direkt in der Rechnungsdetailansicht sehen, um schnell zur archivierten Datei zu gelangen.

## Acceptance Criteria
- [ ] **Konfiguration (Admin):**
  - Ziel-Ordner im Google Drive wählbar (Ordner-Picker)
  - Ablage-Struktur konfigurierbar: `/Jahr/Monat/Objektnummer/` (Standard) oder flach
  - Dateiname-Schema konfigurierbar (Platzhalter: `{datum}`, `{lieferant}`, `{betrag}`, `{rechnungsnummer}`)
  - Verbindung testbar
- [ ] **Automatische Ablage:**
  - Wird ausgelöst, wenn Rechnung Status `Bezahlt` erhält
  - Original-PDF wird in Google Drive hochgeladen
  - Unterordner werden automatisch erstellt, wenn nicht vorhanden
  - Standardmäßiger Dateiname: `YYYY-MM-DD_Lieferant_Bruttobetrag_RechnungsNr.pdf`
- [ ] **Ablage-Bestätigung:**
  - Google Drive Datei-ID und URL werden in der Rechnung gespeichert
  - Status: `Archiviert` + Zeitstempel
  - Link in der Rechnungsdetailansicht (öffnet Google Drive direkt)
- [ ] **Fehlerbehandlung:**
  - Wenn Ablage fehlschlägt: Fehler loggen, Rechnung bleibt `Bezahlt`, Retry möglich
  - Admin-Benachrichtigung bei Ablage-Fehler
- [ ] **Manuelle Ablage:** Buchhalter kann Ablage für einzelne Rechnung manuell auslösen

## Edge Cases
- Was passiert, wenn die Google Drive-Kapazität voll ist? → Fehlermeldung, Ablage schlägt fehl, Buchhalter wird informiert
- Was passiert, wenn eine Datei mit gleichem Namen bereits im Zielordner existiert? → Dateiname erhält Suffix `_2`, `_3` usw.
- Was passiert, wenn die Google Drive-Verbindung unterbrochen ist? → Retry nach 1 Stunde (max. 3 Versuche), dann manuelle Aktion erforderlich
- Was passiert, wenn der Ziel-Ordner im Google Drive gelöscht wird? → Fehler bei nächstem Versuch, Admin muss Ordner neu konfigurieren

## Technical Requirements
- Google Drive API v3 (OAuth2 — gleiche Credentials wie PROJ-3 falls selbes Konto)
- Supabase Edge Function für asynchronen Upload-Trigger
- Drive-Ordner-Erstellung: automatisch via `files.create` mit `mimeType: application/vnd.google-apps.folder`

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
