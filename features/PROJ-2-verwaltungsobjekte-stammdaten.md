# PROJ-2: Verwaltungsobjekte & Stammdaten

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — für Admin-Zugang zur Stammdatenverwaltung

## User Stories
- Als Admin möchte ich Verwaltungsobjekte (Liegenschaften) aus einer Excel-Datei importieren, um nicht alle Daten manuell einzugeben.
- Als Admin möchte ich Verwaltungsobjekte manuell anlegen, bearbeiten und deaktivieren, um Stammdaten aktuell zu halten.
- Als Admin möchte ich pro Verwaltungsobjekt eine oder mehrere Bankverbindungen (IBAN, BIC, Kontoinhaber, Bank) hinterlegen, um den Zahllauf korrekt zu steuern.
- Als Admin möchte ich eine eindeutige Verwaltungsnummer (ID) pro Objekt vergeben, die bei der Rechnungserkennung zur Zuordnung genutzt wird.
- Als Buchhalter möchte ich Verwaltungsobjekte durchsuchen und filtern, um schnell das richtige Objekt zu finden.
- Als System möchte ich Rechnungen anhand von Adressdaten dem richtigen Verwaltungsobjekt zuordnen, um die manuelle Arbeit zu minimieren.

## Acceptance Criteria
- [ ] Excel-Import-Funktion (.xlsx): Mapping von Spalten auf Felder (Objektnummer, Bezeichnung, Adresse, IBAN, BIC, Kontoinhaber)
- [ ] Import-Vorschau vor finalem Import (Zeilen prüfen, Fehler anzeigen)
- [ ] Verwaltungsobjekt-Felder: Objektnummer, Bezeichnung, Straße, PLZ, Ort, Notiz
- [ ] Pro Objekt: 1–N Bankverbindungen (IBAN validiert, BIC, Kontoinhaber, Bank-Name)
- [ ] Standard-Bankverbindung pro Objekt markierbar
- [ ] Objekte als inaktiv markierbar (erscheinen nicht mehr in Dropdown, Rechnungen bleiben erhalten)
- [ ] Suche nach Objektnummer, Bezeichnung, Adresse
- [ ] Listenansicht aller Objekte mit Status und Bankverbindungs-Anzahl
- [ ] Detailansicht: alle Felder + zugehörige Bankverbindungen
- [ ] IBAN-Validierung bei Eingabe (Format + Prüfziffer)
- [ ] Export der Objektliste als Excel (für Abgleich mit Quelle)

## Edge Cases
- Was passiert bei doppelter Objektnummer im Import? → Warnung, Benutzer entscheidet: überschreiben oder überspringen
- Was passiert, wenn eine ungültige IBAN importiert wird? → Import-Fehler für diese Zeile, Rest wird importiert
- Was passiert, wenn ein Objekt Rechnungen hat und deaktiviert wird? → Deaktivierung möglich, offene Rechnungen bleiben dem Objekt zugeordnet, Warnung anzeigen
- Was passiert bei Excel-Dateien mit falschen Spalten? → Klare Fehlermeldung mit Spalten-Mapping-Hilfe
- Was passiert, wenn keine Bankverbindung hinterlegt ist und eine Zahlung erzeugt werden soll? → Zahllauf für dieses Objekt blockiert, Hinweis an Buchhalter

## Technical Requirements
- Excel-Parsing: `xlsx` (SheetJS) Library
- IBAN-Validierung: `ibantools` oder eigene Implementierung nach ISO 13616
- Supabase Storage für temporäre Import-Dateien
- Volltextsuche über Supabase (pg_trgm oder ilike)

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
