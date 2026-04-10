# PROJ-11: CSV/ERP-Export

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-8 (Kontierung) — Buchungssätze müssen vorhanden sein

## User Stories
- Als Buchhalter möchte ich Buchungssätze im DATEV-Buchungsstapel-CSV-Format exportieren, um diese in gängige ERP-Systeme zu importieren.
- Als Buchhalter möchte ich einen Datumsbereich und ein Verwaltungsobjekt für den Export auswählen, um nur relevante Buchungen zu exportieren.
- Als Buchhalter möchte ich eine Vorschau der Export-Daten sehen, bevor ich herunterlade.

## Acceptance Criteria
- [ ] **Export-Konfiguration:**
  - Datumsbereich (von/bis Buchungsdatum)
  - Filter: Verwaltungsobjekt (alle oder einzelne), Status (freigegeben, bezahlt)
  - Format: DATEV Buchungsstapel CSV (Standard), allgemeines CSV
- [ ] **DATEV-CSV-Format:**
  - Header-Zeile: `DATEV-Format-KZ;Versionsnummer;Datenkategorie;...`
  - Buchungszeilen: Betrag, S/H-Kennung, Konto, Gegenkonto, Datum, Belegnummer, Buchungstext, Kostenstelle
  - Korrekte Zeichenkodierung (CP1252 für DATEV-Kompatibilität)
  - Semikolon-getrennt
- [ ] **Allgemeines CSV:**
  - Alle Metadaten einer Rechnung + Buchungssatz
  - UTF-8, Komma-getrennt, Header-Zeile
  - Für beliebige ERP-Systeme nutzbar
- [ ] **Vorschau:** Erste 10 Zeilen des Exports in einer Tabelle anzeigen
- [ ] **Download:** Datei wird direkt heruntergeladen, Dateiname enthält Datumsbereich
- [ ] **Export-Protokoll:** Datum, Zeitraum, Anzahl Buchungssätze, Ersteller werden gespeichert

## Edge Cases
- Was passiert, wenn im gewählten Zeitraum keine Buchungen vorhanden sind? → Hinweismeldung, kein Download
- Was passiert mit Sonderzeichen in Buchungstexten bei DATEV CP1252? → Automatische Konvertierung, nicht darstellbare Zeichen werden durch `?` ersetzt

## Technical Requirements
- CSV-Generierung: server-seitig (Supabase Edge Function), kein Client-seitiger Export für große Datenmengen
- DATEV Buchungsstapel: exakte Spezifikation nach DATEV Schnittstellenbeschreibung

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
