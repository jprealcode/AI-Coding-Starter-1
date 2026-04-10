# PROJ-8: Kontierung & Buchungsvorbereitung

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-2 (Verwaltungsobjekte) — Kontenrahmen je Objekt
- Requires: PROJ-5 (Dashboard) — Kontierungs-UI im Detailpanel

## User Stories
- Als Buchhalter möchte ich für jede Rechnung einen Buchungssatz (Soll-/Haben-Konto) aus dem hinterlegten Kontenrahmen auswählen, um die Rechnungen vorzukontieren.
- Als Buchhalter möchte ich eine Splittbuchung erstellen, um eine Rechnung auf mehrere Kostenkonten aufzuteilen.
- Als Admin möchte ich sowohl SKR03 als auch SKR04 im System hinterlegen und je nach Objekt den passenden Kontenrahmen zuweisen.
- Als Buchhalter möchte ich häufig genutzte Kontierungen als Favoriten speichern, um bei wiederkehrenden Lieferanten schnell zu sein.
- Als Buchhalter möchte ich, dass das System basierend auf dem Lieferanten eine Kontierungs-Empfehlung macht (Lerneffekt).
- Als Buchhalter möchte ich die Kostenstelle (Verwaltungsobjekt-Nummer) automatisch aus der Objekt-Zuordnung übernehmen.

## Acceptance Criteria
- [ ] **Kontenrahmen-Verwaltung (Admin):**
  - SKR03 und SKR04 vollständig hinterlegt (Kontonummer + Kontobezeichnung + Kontenart)
  - Pro Verwaltungsobjekt: Kontenrahmen auswählbar (SKR03 oder SKR04)
  - Konten können als "aktiv/inaktiv" markiert werden (inaktive erscheinen nicht in Dropdown)
  - Eigene benutzerdefinierte Konten hinzufügbar
- [ ] **Vorkontierung (Buchhalter):**
  - Soll-Konto und Haben-Konto aus Kontenrahmen wählbar (Suche nach Nummer oder Bezeichnung)
  - Kostenstelle: automatisch aus Verwaltungsobjekt übernommen, manuell änderbar
  - MwSt-Code: auswählbar (0%, 7%, 19%, steuerfreie Leistung, etc.)
  - Buchungstext: automatisch aus Lieferant + Rechnungsnummer, manuell editierbar
- [ ] **Splittbuchung:**
  - Rechnung auf 2–N Zeilen aufteilen
  - Je Zeile: Betrag, Soll-Konto, Haben-Konto, Kostenstelle, MwSt-Code, Buchungstext
  - Validierung: Summe aller Zeilen muss Rechnungsbetrag ergeben
  - Visuelles Feedback: Rest-Betrag wird angezeigt
- [ ] **Kontierungs-Empfehlung:**
  - Beim gleichen Lieferant + gleicher Objekt-Kombination wird letzte Kontierung vorgeschlagen
  - Buchhalter kann mit einem Klick übernehmen
- [ ] **Favoriten:**
  - Häufige Kontierungen als Favorit speichern (Name, Soll, Haben, MwSt)
  - Schnell-Auswahl über Favoriten-Liste
- [ ] **Pflichtfeld-Validierung:**
  - Soll-Konto und Haben-Konto sind Pflicht vor Weitergabe an Zahllauf/DATEV
  - Warnung wenn Kontierung fehlt

## Edge Cases
- Was passiert, wenn der Kontenrahmen des Objekts geändert wird und es bereits kontierte Rechnungen gibt? → Bestehende Kontierungen bleiben, neue Rechnungen nutzen neuen Kontenrahmen
- Was passiert bei einer Splittbuchung, die nicht auf 0 aufgeht? → Speichern blockiert, Rest-Betrag wird rot angezeigt
- Was passiert, wenn für einen Lieferanten widersprüchliche historische Kontierungen existieren? → Häufigste Kontierung als Empfehlung, alle Varianten anzeigbar
- Was passiert, wenn ein Konto aus dem Kontenrahmen deaktiviert wird, aber noch in alten Buchungssätzen verwendet wird? → Alte Buchungssätze bleiben unverändert, neues Anlegen mit diesem Konto blockiert

## Technical Requirements
- SKR03 und SKR04 als Seeds in der Datenbank (vollständige Kontenpläne)
- Kontenrahmen-Tabelle: Kontonummer (PK), Bezeichnung, Kontenart, Kontenrahmen (SKR03/SKR04), aktiv
- Buchungssatz-Tabelle: Rechnung-ID, Position, Betrag, Soll, Haben, Kostenstelle, MwSt-Code, Text

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
