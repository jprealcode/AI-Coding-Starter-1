# PROJ-13: Eigentümer-Stammdaten & Objekt-Erweiterung

## Status: Planned
**Created:** 2026-04-18
**Last Updated:** 2026-04-18

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Hauptverantwortlicher = Benutzer aus dem System
- Requires: PROJ-2 (Verwaltungsobjekte) — Erweiterung der bestehenden Objekt-Verwaltung
- Required by: PROJ-4 (OCR-Pipeline) — Leistungsempfängerprüfung braucht Eigentümer-Daten
- Required by: PROJ-6 (Freigabe-Workflow) — Hauptverantwortlicher steuert Rechnungszuweisung

## Kontext

Jedes Verwaltungsobjekt (VE) hat genau einen Eigentümer. Dieser Eigentümer kann eine Privatperson, eine Firma (GmbH, AG, KG), eine Objektgesellschaft oder eine WEG (Wohnungseigentümergemeinschaft) sein. Die WEG tritt dabei als eigenständige Rechtsperson auf (teilrechtsfähig) und hat ein eigenes Bankkonto.

Der Eigentümer ist zentral für zwei Dinge:
1. **Leistungsempfängerprüfung (PROJ-4):** Ist die Rechnung an den richtigen Eigentümer adressiert?
2. **Zahlungsabwicklung (PROJ-7):** Von welchem Konto wird die Rechnung bezahlt?

Zusätzlich bekommt jedes Objekt einen **Hauptverantwortlichen** — den Benutzer, dem Rechnungen zur Freigabe standardmäßig zugewiesen werden.

Da diese Daten teils aus der bestehenden Excel-Liste kommen, wird der Import erweitert und um einen **Export** ergänzt — damit einzelne Felder (z.B. geänderte Bankverbindung, neuer Hauptverantwortlicher) nicht einen kompletten Reimport erfordern.

## User Stories

- Als Buchhalter möchte ich zu jedem Verwaltungsobjekt den Eigentümer mit allen relevanten Daten hinterlegen, damit Rechnungen korrekt zugeordnet und geprüft werden können.
- Als System möchte ich beim OCR-Durchlauf den erkannten Rechnungsempfänger mit dem hinterlegten Eigentümer des Verwaltungsobjekts abgleichen (Leistungsempfängerprüfung in PROJ-4).
- Als Buchhalter möchte ich zu jedem Eigentümer eine oder mehrere Bankverbindungen hinterlegen, damit klar ist, von welchem Konto Rechnungen bezahlt werden.
- Als Buchhalter möchte ich pro Verwaltungsobjekt einen Hauptverantwortlichen festlegen, dem Rechnungen automatisch zur Freigabe zugewiesen werden.
- Als Buchhalter möchte ich die erweiterten Objekt-Daten (inkl. Eigentümer, Bankverbindung, Hauptverantwortlicher) aus dem System als Excel exportieren, Änderungen darin vornehmen und wieder importieren — ohne alle Daten neu einzugeben.
- Als Buchhalter möchte ich einzelne Felder (z.B. Bankverbindung, Hauptverantwortlicher) direkt in der UI ändern können, ohne einen Excel-Import durchführen zu müssen.

## Acceptance Criteria

### Eigentümer-Stammdaten

- [ ] Jedes Verwaltungsobjekt hat genau einen verknüpften Eigentümer
- [ ] Ein Eigentümer kann mehreren Verwaltungsobjekten zugeordnet sein (z.B. eine Holding besitzt mehrere VEs)
- [ ] Eigentümer-Typen: Privatperson, GmbH, AG, KG, UG, GbR, WEG, Sonstige
- [ ] Pflichtfelder: Name (vollständig), Typ
- [ ] Optionale Felder: Adresse (Straße, PLZ, Ort), E-Mail, Telefon, USt-ID / Steuernummer
- [ ] WEG-Sonderfall: WEG wird wie eine juristische Person behandelt (eigener Name, eigenes Konto)
- [ ] Eigentümer-Verwaltung unter `/admin/eigentümer` (Liste + Detailansicht)
- [ ] Eigentümer anlegen, bearbeiten, löschen (nur Admin/Buchhalter)
- [ ] Löschen blockiert, wenn Eigentümer noch Verwaltungsobjekten zugeordnet ist

### Eigentümer-Bankverbindungen

- [ ] Pro Eigentümer können mehrere Bankverbindungen hinterlegt werden
- [ ] Felder je Bankverbindung: IBAN, BIC, Bankname, Kontoinhaber, Verwendungszweck-Kürzel
- [ ] Eine Bankverbindung kann als "Standard" markiert werden (wird für Zahlungsvorschlag in PROJ-7 verwendet)
- [ ] Pro Verwaltungsobjekt kann eine abweichende Bankverbindung des Eigentümers ausgewählt werden (falls Eigentümer mehrere Konten hat)
- [ ] Bankverbindungen sind direkt auf der Objekt-Detailseite (PROJ-2) einsehbar und bearbeitbar
- [ ] Änderungen an Bankverbindungen werden mit Timestamp + User protokolliert (Audit-Trail)

### Hauptverantwortlicher pro Objekt

- [ ] Jedes Verwaltungsobjekt bekommt ein Feld "Hauptverantwortlicher" (Benutzer aus PROJ-1)
- [ ] Standard: Admin/Buchhalter (wenn nichts gesetzt)
- [ ] Hauptverantwortlicher ist der Benutzer, dem Rechnungen für dieses Objekt automatisch zur Freigabe zugewiesen werden (genutzt in PROJ-6)
- [ ] Auswahl über Dropdown der aktiven Benutzer
- [ ] Änderbar direkt in der Objekt-Detailansicht (alle Benutzer mit Admin-Berechtigung)

### Excel-Import Erweiterung

- [ ] Bestehender Excel-Import (PROJ-2) wird um folgende Spalten erweitert:
  - Eigentümer-Name
  - Eigentümer-Typ (Privatperson / GmbH / AG / KG / UG / GbR / WEG / Sonstige)
  - Eigentümer-Adresse (Straße, PLZ, Ort)
  - Eigentümer-E-Mail
  - Eigentümer-USt-ID
  - IBAN (Standard-Bankverbindung)
  - BIC
  - Bankname
  - Hauptverantwortlicher (E-Mail-Adresse des Benutzers)
- [ ] Wenn Eigentümer-Name bereits in der Datenbank existiert (gleicher Name): bestehenden Eigentümer verknüpfen statt Duplikat anlegen
- [ ] Wenn Hauptverantwortlicher-E-Mail keinem Benutzer entspricht: Import-Warnung, Feld leer lassen
- [ ] Bestehende Objekte werden beim Re-Import aktualisiert (Update, kein Duplikat) — Identifikation über VE-Nummer oder Objektbezeichnung

### Excel-Export (NEU)

- [ ] Button "Als Excel exportieren" in der Objekt-Übersicht
- [ ] Export enthält alle Objekt-Felder inkl. Eigentümer, Bankverbindung (Standard), Hauptverantwortlicher (E-Mail)
- [ ] Exportierte Excel kann direkt bearbeitet und wieder importiert werden (gleiche Spaltenstruktur)
- [ ] Anwendungsfall: Buchhalter ändert 3 Bankverbindungen in Excel → reimportiert → nur diese 3 Objekte werden aktualisiert

### Objekt-Detailansicht Erweiterung (PROJ-2 UI)

- [ ] Bestehende Objekt-Detailansicht (property-detail-sheet.tsx) wird erweitert um:
  - Abschnitt "Eigentümer" (Name, Typ, Adresse, Kontakt) — mit Bearbeiten-Möglichkeit
  - Abschnitt "Bankverbindungen" (Liste aller Konten des Eigentümers für dieses Objekt)
  - Abschnitt "Hauptverantwortlicher" (Dropdown-Auswahl)
- [ ] Änderungen direkt in der Detailansicht speicherbar (kein Excel-Import nötig)

## Edge Cases

- **Ein Eigentümer mit mehreren Objekten ändert seine Bankverbindung:** Änderung am Eigentümer-Stammsatz wirkt sich auf alle verknüpften Objekte aus — sofern kein objektspezifisches Konto hinterlegt ist
- **WEG als Eigentümer ohne USt-ID:** Pflichtfeld ist nur Name + Typ — alle anderen Felder optional
- **Hauptverantwortlicher verlässt das Unternehmen (Benutzer deaktiviert):** Objekte mit deaktiviertem Hauptverantwortlichen bekommen Status-Hinweis "Hauptverantwortlicher nicht aktiv — bitte neu zuweisen"
- **Excel-Import: Spalte fehlt oder ist leer:** Feld wird leer gelassen / nicht überschrieben — kein Fehler, nur Warnung in Import-Protokoll
- **Excel-Import: VE-Nummer existiert nicht:** Neues Objekt wird angelegt (wie bisher in PROJ-2)
- **Eigentümer hat keine E-Mail:** Kein Blocking; E-Mail-Versand in PROJ-4 zeigt Warnung "Keine Eigentümer-E-Mail hinterlegt"

## Technical Requirements

- Neue DB-Tabelle: `owners` (Eigentümer-Stammdaten)
- Neue DB-Tabelle: `owner_bank_accounts` (Bankverbindungen je Eigentümer)
- Erweiterung `properties`: Spalten `owner_id` (FK → owners), `primary_bank_account_id` (FK → owner_bank_accounts), `hauptverantwortlicher_user_id` (FK → profiles)
- Excel-Export: `xlsx`-Bibliothek (bereits für Import vorhanden in PROJ-2)
- Audit-Trail für Bankverbindungs-Änderungen: Timestamp + user_id

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
