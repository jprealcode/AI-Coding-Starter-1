# PROJ-5: Dashboard & Rechnungsindex

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — rollenbasierte Ansichten
- Requires: PROJ-2 (Verwaltungsobjekte) — Objektzuordnung anzeigen
- Requires: PROJ-3 (Rechnungseingang) — Rechnungen im Eingangskorb
- Requires: PROJ-4 (OCR-Pipeline) — erkannte Metadaten anzeigen

## User Stories
- Als Buchhalter möchte ich im Dashboard links eine Liste aller Eingangsrechnungen sehen und rechts die Details der ausgewählten Rechnung, um effizient durch die Rechnungen zu navigieren.
- Als Buchhalter möchte ich die erkannten Metadaten direkt im Dashboard korrigieren und bestätigen, um Fehler der OCR zu bereinigen.
- Als Buchhalter möchte ich Rechnungen nach Status, Objekt, Datum und Betrag filtern, um schnell relevante Rechnungen zu finden.
- Als Buchhalter möchte ich eine Warnung erhalten, wenn eine potenzielle Duplikat-Rechnung erkannt wird, um Doppelzahlungen zu vermeiden.
- Als Mitarbeiter möchte ich nur meine zur Freigabe zugewiesenen Rechnungen sehen, um nicht abgelenkt zu werden.
- Als Buchhalter möchte ich einen Überblick über alle Rechnungen in einem Index (Gesamtliste mit Such- und Filterfunktion) haben.

## Acceptance Criteria
- [ ] **Split-Screen Dashboard:**
  - Links: Rechnungsliste (kompakte Karten: Lieferant, Betrag, Datum, Status, Objekt)
  - Rechts: Detailansicht der ausgewählten Rechnung
  - Responsive: auf kleinen Bildschirmen Tabs statt Split
- [ ] **PDF-Viewer:** Original-PDF wird rechts oben angezeigt (scrollbar, zoombar)
- [ ] **Metadaten-Panel:** Alle extrahierten Felder editierbar, Konfidenz-Score pro Feld farblich markiert (grün/gelb/rot)
- [ ] **Status-Badges:** `Neu`, `In Prüfung`, `Zugewiesen`, `Freigegeben`, `Konflikt`, `Zahlung ausstehend`, `Bezahlt`
- [ ] **Filter:** Status, Verwaltungsobjekt, Lieferant, Datumsbereich, Betrag, Quelle (Gmail/Upload/Drive)
- [ ] **Suche:** Freitextsuche über Lieferant, Rechnungsnummer, Betrag
- [ ] **Duplikat-Erkennung:**
  - Prüfung bei Eingang: gleiche Rechnungsnummer + gleicher Lieferant + ähnlicher Betrag (±1%)
  - Warnung-Banner in der Detailansicht mit Link zur verdächtigen Original-Rechnung
  - Admin kann Duplikat bestätigen (ablehnen) oder als Nicht-Duplikat markieren
- [ ] **Rechnungsindex (separate Seite):**
  - Alle jemals verarbeiteten Rechnungen (auch archivierte/bezahlte)
  - Volltext-Suche, Filter, Sortierung
  - Export als CSV
- [ ] **Rollenbasierte Ansicht:**
  - Admin: alle Rechnungen, alle Filter
  - Approver: nur zugewiesene Rechnungen, kein Rechnungsindex
- [ ] **Stapelverarbeitung:** Mehrere Rechnungen auswählbar → Sammelzuweisung oder Status-Änderung
- [ ] **KPI-Banner oben:** Anzahl neue Rechnungen, offen, freigegeben, fällig (heute/diese Woche)

## Edge Cases
- Was passiert, wenn die OCR noch läuft und die Rechnung geklickt wird? → Lade-Animation im Detailpanel, "Erkennung läuft..."
- Was passiert bei 100+ Rechnungen in der Liste? → Virtuelles Scrollen (nur sichtbare Elemente rendern), Paginierung als Fallback
- Was passiert, wenn ein Feld manuell korrigiert wird? → Änderung sofort gespeichert (Auto-Save mit Debounce), visuelles Feedback
- Was passiert, wenn ein PDF nicht angezeigt werden kann? → Fehler-Placeholder mit Download-Link für das Original
- Was passiert bei sehr langen Lieferantennamen in der Karte? → Truncate mit Tooltip

## Technical Requirements
- PDF-Viewer: `react-pdf` (pdfjs-basiert)
- Echtzeit-Updates: Supabase Realtime (neue Rechnungen erscheinen ohne Reload)
- Virtuelles Scrollen: `@tanstack/react-virtual`
- Farben: Professionelles Design (Slate/Blue-Palette), modernes Layout
- Performance: Listenrendering < 200ms für 200 Rechnungen

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
