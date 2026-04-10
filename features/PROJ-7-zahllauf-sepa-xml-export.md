# PROJ-7: Zahllauf & SEPA-XML-Export

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-2 (Verwaltungsobjekte) — Bankverbindungen der Objekte
- Requires: PROJ-6 (Freigabe-Workflow) — nur freigegebene Rechnungen
- Requires: PROJ-5 (Dashboard) — Zahllauf-UI

## User Stories
- Als Buchhalter möchte ich alle freigegebenen Rechnungen im Zahllauf-Bereich sehen, um einen Überblick zu haben.
- Als Buchhalter möchte ich einen Zahllauf starten, der alle zur Zahlung freigegebenen Rechnungen bündelt.
- Als Buchhalter möchte ich SEPA-XML-Dateien pro Bank (Auftraggeber-IBAN) generieren, um diese in meine Banking-Software einzulesen.
- Als Buchhalter möchte ich einzelne Rechnungen aus einem Zahllauf ausschließen, ohne sie abzulehnen.
- Als Buchhalter möchte ich nach dem Zahllauf die Rechnungen als "bezahlt" markieren und ein Zahlungsdatum hinterlegen.
- Als Buchhalter möchte ich eine Zusammenfassung jedes Zahllaufs abrufen können (welche Rechnungen, welche Beträge, welche Bank).

## Acceptance Criteria
- [ ] **Zahllauf-Übersicht:**
  - Alle Rechnungen mit Status `Zahlung ausstehend` aufgelistet
  - Gruppierung nach Verwaltungsobjekt und Bank
  - Summe pro Bank und Gesamtsumme
  - Einzelne Rechnungen aus aktuellem Zahllauf ausschließen (ohne Ablehnung)
- [ ] **SEPA-XML-Generierung:**
  - Standard: SEPA Credit Transfer (pain.001.003.03 oder pain.001.001.03)
  - Eine XML-Datei pro Auftraggeber-IBAN (Hausverwaltungs-Bank)
  - Enthält: Auftraggeber-IBAN/BIC, Empfänger-IBAN/BIC/Name, Betrag, Verwendungszweck (Rechnungsnummer + Lieferant), Fälligkeitsdatum
  - Verwendungszweck: max. 140 Zeichen, automatisch aus Rechnungsnummer und Lieferantenname zusammengesetzt
  - Validierung: XML gegen SEPA-Schema validieren vor Download
- [ ] **Zahllauf-Erstellung:**
  - Buchhalter wählt Rechnungen (alle oder Auswahl) → Zahllauf erstellen
  - Zahllauf bekommt eine eindeutige ID und Zeitstempel
  - SEPA-XML-Dateien werden zum Download bereitgestellt (ZIP bei mehreren Banken)
- [ ] **Nach dem Zahllauf:**
  - Buchhalter bestätigt "Zahlung ausgeführt" mit optionalem Zahlungsdatum
  - Rechnungen erhalten Status `Bezahlt`
  - Zahllauf-Protokoll: alle enthaltenen Rechnungen, Beträge, XMLs
- [ ] **Zahllauf-Historie:**
  - Liste aller bisherigen Zahlläufe mit Datum, Anzahl Rechnungen, Gesamtbetrag
  - Detailansicht: enthaltene Rechnungen, XML-Dateien erneut downloadbar
- [ ] **Sicherheit:**
  - Nur Admin/Buchhalter kann Zahlläufe erstellen und bestätigen
  - Zahllauf kann bis zur Bestätigung storniert werden (Rechnungen zurück zu `Zahlung ausstehend`)

## Edge Cases
- Was passiert, wenn eine Rechnung keine Empfänger-IBAN hat? → Aus Zahllauf ausgeschlossen, Warnung anzeigen, manuelle IBAN-Eingabe möglich
- Was passiert, wenn eine Rechnung einem Objekt ohne Bankverbindung zugeordnet ist? → Warnung, Rechnung aus Zahllauf ausgeschlossen
- Was passiert bei Beträgen mit falschen Dezimalstellen im SEPA-XML? → Immer 2 Dezimalstellen, Rundung kaufmännisch
- Was passiert, wenn die SEPA-XML-Validierung fehlschlägt? → Klare Fehlermeldung mit betroffener Rechnung, kein Download
- Was passiert bei einem sehr großen Zahllauf (100+ Rechnungen)? → Generierung asynchron, Fortschrittsanzeige, Download-Link per E-Mail (optional)
- Was passiert, wenn eine Rechnung nach der Zahllauf-Erstellung noch in Konflikt geht? → Wenn noch nicht bestätigt, kann aus Zahllauf entfernt werden

## Technical Requirements
- SEPA-XML: Generierung per `sepa` npm-Paket oder eigene Template-Lösung nach ISO 20022
- XML-Validierung: Schema-Validierung (pain.001.003.03 XSD)
- ZIP-Generierung: `jszip` oder `archiver`
- Supabase Storage: Zahllauf-Protokolle und XML-Dateien langfristig speichern

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
