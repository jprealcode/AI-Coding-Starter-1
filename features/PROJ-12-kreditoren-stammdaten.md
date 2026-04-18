# PROJ-12: Kreditoren-Stammdaten (Kreditoren-Kartei)

## Status: Planned
**Created:** 2026-04-18
**Last Updated:** 2026-04-18

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Benutzerrollen für Lösch-Berechtigung
- Requires: PROJ-3 (Rechnungseingang) — OCR-Ergebnisse liefern Kreditoren-Daten
- Required by: PROJ-4 (OCR-Pipeline) — Kreditoren-Kurzname für Datei-Benennung
- Required by: PROJ-9 (DATEV-Anbindung) — DATEV-Kreditoren-Nummer-Mapping
- Required by: PROJ-10 (Google Drive) — Dateiname enthält Kreditoren-Kurznamen

## Kontext
Jede eingehende Rechnung hat einen Lieferanten (Kreditor). Damit Lieferantendaten nicht bei jeder Rechnung neu eingegeben werden müssen, wird eine zentrale Kreditoren-Kartei geführt. Die Kartei wird vollautomatisch beim OCR-Durchlauf befüllt — bei unbekannten Lieferanten legt das System sofort einen neuen Eintrag an. Alle Benutzer können Einträge korrigieren.

Ein besonderes Merkmal ist der **Kreditoren-Kurzname**: Ein kurzes Kürzel (z.B. `MUSTER-GMBH`), das bei der automatischen Datei-Benennung verwendet wird. Er muss eindeutig, kurz und ohne Sonderzeichen sein.

Jeder Kreditor bekommt außerdem zwei Nummern:
- **Interne Kreditoren-Nummer**: Fortlaufend, automatisch vergeben (K-0001, K-0002, …)
- **DATEV-Kreditoren-Nummer**: Optional, manuell eingetragen — die Nummer, die der Steuerberater für diesen Kreditor in DATEV vergeben hat (kann abweichen)

## User Stories

- Als System möchte ich beim OCR-Durchlauf einen unbekannten Lieferanten automatisch in der Kreditoren-Kartei anlegen, damit keine manuelle Datenpflege nötig ist.
- Als System möchte ich einen erkannten Lieferanten automatisch mit einem bestehenden Kreditoren-Eintrag abgleichen (Name + IBAN), damit keine Duplikate entstehen.
- Als Buchhalter möchte ich alle Kreditoren in einer Liste einsehen, filtern und suchen können, damit ich schnell den richtigen Eintrag finde.
- Als Benutzer möchte ich Kreditoren-Daten (Name, Adresse, E-Mail, Telefon, IBAN) korrigieren können, wenn OCR-Daten unvollständig oder falsch sind.
- Als Buchhalter möchte ich jedem Kreditor einen Kurznamen vergeben, der automatisch für die Datei-Benennung verwendet wird.
- Als Buchhalter möchte ich die DATEV-Kreditoren-Nummer hinterlegen, damit das Mapping für die spätere DATEV-Anbindung vorbereitet ist.
- Als Buchhalter möchte ich zwei Duplikat-Einträge zusammenführen können, damit die Kartei sauber bleibt.
- Als System möchte ich warnen, wenn der Kreditoren-Kurzname noch nicht gesetzt ist, damit die Datei-Benennung in PROJ-4/10 nicht fehlschlägt.

## Acceptance Criteria

### Kreditoren-Übersicht
- [ ] Seite `/admin/kreditoren` mit Kreditoren-Liste (Tabelle)
- [ ] Felder sichtbar in der Liste: Interne-Nr., Kurzname, Name, E-Mail, IBAN (gekürzt), Anzahl Rechnungen
- [ ] Suche nach Name, Kurzname, IBAN
- [ ] Filter: Kurzname fehlt (⚠️), DATEV-Nummer fehlt, ohne E-Mail
- [ ] Sortierung nach Name, Interne-Nr., zuletzt aktualisiert

### Kreditoren-Detailansicht / Bearbeitung
- [ ] Alle Felder bearbeitbar für alle eingeloggten Benutzer:
  - Name (vollständig) — Pflicht
  - Kurzname — Pflicht vor Datei-Benennung (max. 20 Zeichen, nur A–Z, 0–9, Bindestrich, automatisch Großbuchstaben)
  - Adresse (Straße, PLZ, Ort, Land)
  - E-Mail (für Rücksende-Funktion in PROJ-4)
  - Telefon
  - IBAN + BIC
  - USt-ID / Steuernummer
  - Interne Kreditoren-Nummer (automatisch vergeben, nicht editierbar)
  - DATEV-Kreditoren-Nummer (optional, manuell)
  - Notiz-Feld (Freitext)
- [ ] Nur Buchhalter/Admin darf Kreditoren löschen

### Automatische Anlage (aus OCR-Pipeline)
- [ ] Bei jeder verarbeiteten Rechnung: OCR-Ergebnis (Lieferantenname + IBAN) wird gegen Kartei geprüft
- [ ] Ähnlichkeits-Match ≥ 80%: bestehender Kreditor wird zugeordnet, kein neuer Eintrag
- [ ] Kein Match: Neuer Kreditor wird automatisch mit allen erkannten Feldern angelegt
- [ ] Interne Kreditoren-Nummer wird automatisch vergeben (fortlaufend, K-0001, K-0002, …)
- [ ] Kurzname wird bei automatischer Anlage automatisch vorgeschlagen: System entfernt Rechtssuffixe (GmbH, AG, KG, UG, GbR, e.V., Co., Ltd.) und nimmt den ersten bedeutsamen Namensteil in Großbuchstaben (Beispiel: "Vattenfall Europe Sales GmbH" → Vorschlag: "VATTENFALL")
- [ ] Kurzname-Vorschlag muss vom Buchhalter bestätigt oder korrigiert werden — gilt als "unbestätigt" bis zur manuellen Prüfung (⚠️-Markierung)
- [ ] Datei-Benennung und Drive-Upload sind erst nach Bestätigung des Kurznamens möglich
- [ ] System-Log: wann angelegt, aus welcher Rechnung (Rechungs-ID als Referenz)

### Duplikate-Handling
- [ ] Bei automatischer Anlage: Wenn Ähnlichkeit 60–79% → neuer Eintrag + Hinweis "Mögliches Duplikat: [Name]"
- [ ] Buchhalter kann zwei Einträge zusammenführen: Ziel-Eintrag wählen, Quell-Eintrag wird gelöscht, alle Rechnungsverknüpfungen werden auf Ziel umgehängt
- [ ] Duplikat-Erkennung auch manuell auslösbar (Button "Duplikate prüfen")

### Datei-Benennung Vorbereitung
- [ ] Kurzname ist eindeutig (kein Duplikat erlaubt)
- [ ] Kurzname-Validierung: nur A–Z, 0–9, Bindestrich; kein Leerzeichen; max. 20 Zeichen
- [ ] Wenn Kurzname fehlt: Rechnung erhält Status `dateiname_unvollstaendig`, kein Drive-Upload möglich

## Edge Cases

- **Zwei Rechnungen vom gleichen Lieferanten kommen gleichzeitig an:** System prüft race-condition-sicher — kein doppelter Eintrag durch gleichzeitige OCR-Jobs
- **OCR erkennt Lieferantennamen unvollständig (z.B. nur "Muster GmbH" statt "Musterhaus Verwaltungs GmbH"):** Eintrag wird angelegt mit vorhandenem Teilnamen; Buchhalter korrigiert manuell; keine Blockade
- **Lieferant hat keine E-Mail-Adresse:** Eintrag möglich; Rücksende-Funktion zeigt Warnung "Keine E-Mail hinterlegt — bitte manuell eintragen"
- **Gleicher Lieferant mit zwei verschiedenen IBANs (z.B. Filialen):** Separate Einträge erlaubt; Buchhalter entscheidet welcher korrekt ist
- **DATEV-Kreditoren-Nummer fehlt:** Kein Blocking; wird als leer gespeichert; DATEV-Export-Warnung erst in PROJ-9
- **Kurzname soll geändert werden:** Änderung möglich, aber alle historischen Dateinamen bleiben unverändert (nur zukünftige Rechnungen nutzen neuen Kurznamen)
- **Kreditor wird gelöscht, hat aber Rechnungen:** Löschen blockiert — Buchhalter muss Rechnungen zuerst einem anderen Kreditor zuordnen oder Kreditor als "inaktiv" markieren

## Technical Requirements

- Suche: Debounced (300ms), mindestens nach Name und IBAN
- Ähnlichkeits-Matching: Levenshtein-Distanz oder ähnliches (serverseitig, nicht im Browser)
- Interne Kreditoren-Nummer: Atomare Sequenz in Datenbank (kein Konflikt bei gleichzeitiger Anlage)
- Alle Änderungen: Timestamp + User-ID speichern (Audit-Trail)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
