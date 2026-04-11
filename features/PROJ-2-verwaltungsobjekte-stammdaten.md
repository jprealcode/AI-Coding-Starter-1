# PROJ-2: Verwaltungsobjekte & Stammdaten

## Status: In Progress
**Created:** 2026-04-10
**Last Updated:** 2026-04-11

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

### Seitenstruktur & Komponenten
```
/admin/objekte                     ← Listenansicht (nur für Admin)
├── Aktionsleiste
│   ├── Suchfeld (Objektnummer, Bezeichnung, Adresse)
│   ├── [+ Neues Objekt]-Button
│   ├── [Excel importieren]-Button
│   └── [Excel exportieren]-Button
│
├── Objekttabelle
│   └── Zeilen: Objektnummer | Bezeichnung | Ort | Bankverbindungen | Status | Aktionen
│       └── Klick → öffnet Detail-Sheet (seitliches Panel)
│
└── Import-Dialog
    ├── Schritt 1: Excel-Datei hochladen
    ├── Schritt 2: Vorschau-Tabelle (gültige Zeilen grün, fehlerhafte rot)
    └── Schritt 3: Bestätigen → Import

Objekt-Detail-Sheet (seitliches Panel, kein Seitenwechsel)
├── Stammdaten-Abschnitt
│   ├── Objektnummer, Bezeichnung, Straße, PLZ, Ort, Notiz
│   └── [Bearbeiten]-Button → Felder werden editierbar
│
├── Bankverbindungen-Abschnitt
│   ├── Liste: IBAN | BIC | Kontoinhaber | Bank | Standard? | Löschen
│   └── [+ Bankverbindung hinzufügen]-Zeile
│
└── Fußzeile: [Objekt deaktivieren] | [Speichern]
```

### Datenmodell

```
Verwaltungsobjekt (Tabelle: properties)
├── Objektnummer       → eindeutige ID (z. B. "HV-042"), vom Admin vergeben
├── Bezeichnung        → lesbarer Name ("Musterstraße 12, München")
├── Straße             → für automatische Rechnungszuordnung (PROJ-4)
├── PLZ + Ort          → ebenfalls für Zuordnung
├── Notiz              → freitext, intern
├── Ist aktiv?         → inaktive Objekte erscheinen nicht in Dropdowns
└── Erstellt am        → automatisch gesetzt

Bankverbindung (Tabelle: bank_accounts, 1–N pro Objekt)
├── IBAN               → validiert nach ISO 13616 (Prüfziffer geprüft)
├── BIC                → SWIFT-Code der Bank
├── Kontoinhaber       → Name des Kontoinhabers
├── Bank-Name          → lesbarer Name der Bank
└── Ist Standard?      → genau eine Bankverbindung pro Objekt ist Standard
```

Gespeichert in: **Supabase PostgreSQL** (zwei Tabellen: `properties` + `bank_accounts`)

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Excel-Import vollständig im Browser (kein Server-Upload) | SheetJS liest die Datei lokal, wir schicken nur die geparsten Daten ans Backend. Kein temporärer Datei-Upload zu Supabase Storage nötig. |
| Suche: ILIKE in Datenbank | Mit 20–100 Objekten kein Volltext-Index nötig. ILIKE deckt alle Suchfelder ab und bleibt einfach. |
| Detail als Sheet (seitliches Panel) statt eigene Seite | Buchhalter kann Liste im Hintergrund sehen, kein Seitenwechsel nötig — schneller im Tagesgeschäft. |
| Standard-Bankverbindung: DB-Constraint sichert Eindeutigkeit | Datenbank garantiert, dass nie zwei Standard-IBANs pro Objekt existieren — unabhängig vom Frontend. |
| IBAN-Validierung: ibantools Bibliothek | Fertig-Implementierung nach ISO 13616 — verhindert Tippfehler vor dem SEPA-Zahllauf (PROJ-7). |
| Rollenbasierter Zugriff: nur Admin darf schreiben | Approver lesen Objekte (für Rechnungs-Zuordnung), Admin schreibt. RLS in Datenbank sichert das ab. |

### API-Routen

```
GET    /api/admin/properties                               → alle Objekte (mit Bankanzahl + Suche)
POST   /api/admin/properties                               → neues Objekt anlegen
POST   /api/admin/properties/import                        → Excel-Batch-Import
GET    /api/admin/properties/[id]                          → Objekt-Detail inkl. Bankverbindungen
PATCH  /api/admin/properties/[id]                          → Felder oder Status aktualisieren
GET    /api/admin/properties/export                        → Daten für Excel-Export

POST   /api/admin/properties/[id]/bank-accounts            → Bankverbindung hinzufügen
PATCH  /api/admin/properties/[id]/bank-accounts/[bid]      → Bankverbindung bearbeiten
DELETE /api/admin/properties/[id]/bank-accounts/[bid]      → Bankverbindung löschen
```

### Abhängigkeiten (neue Pakete)

| Paket | Zweck |
|---|---|
| `xlsx` (SheetJS) | Excel-Dateien lesen und schreiben (Import + Export) |
| `ibantools` | IBAN-Validierung nach ISO 13616 inkl. Prüfzifferberechnung |

## Implementation Notes (Frontend)

### Gebaut (2026-04-11)
- `src/app/(protected)/admin/objekte/page.tsx` — Server Component, lädt Properties aus Supabase, Admin-Guard
- `src/components/properties/properties-client.tsx` — Tabelle mit Suche, Export, client-seitiges Filtern
- `src/components/properties/new-property-dialog.tsx` — Dialog zum Anlegen neuer Objekte (react-hook-form + zod)
- `src/components/properties/property-detail-sheet.tsx` — Sheet mit Stammdaten (View + Edit), Bankverbindungen (Add, Set-Default, Delete), Deaktivieren/Reaktivieren
- `src/components/properties/import-dialog.tsx` — Excel-Import mit client-seitigem Parsing (SheetJS), Vorschau-Tabelle, Duplikat-Handling (Skip/Overwrite)

### Neue Pakete
- `xlsx` (SheetJS) — Excel Import + Export
- `ibantools` — IBAN-Validierung

### Abweichungen
- Excel-Import: client-seitig (kein Supabase Storage) — einfacher und schneller
- Suche: client-seitig (mit 20–100 Objekten ausreichend)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
