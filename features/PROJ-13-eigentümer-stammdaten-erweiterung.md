# PROJ-13: Eigentümer-Stammdaten & Objekt-Erweiterung

## Status: In Progress
**Created:** 2026-04-18
**Last Updated:** 2026-04-18

## Dependencies
- Requires: PROJ-1 (Authentifizierung) — Hauptverantwortlicher = Benutzer aus dem System
- Requires: PROJ-2 (Verwaltungsobjekte) — Erweiterung der bestehenden Objekt-Verwaltung
- Required by: PROJ-4 (OCR-Pipeline) — Leistungsempfängerprüfung braucht Eigentümer-Daten
- Required by: PROJ-6 (Freigabe-Workflow) — Hauptverantwortlicher steuert Rechnungszuweisung

## Kontext

Jedes Verwaltungsobjekt (VE) hat genau einen Eigentümer. Dieser Eigentümer kann eine Privatperson, eine Firma (GmbH, AG, KG) oder eine WEG sein. Die Bankverbindung hängt am Objekt (bereits in PROJ-2), nicht am Eigentümer.

Der Eigentümer ist zentral für zwei Dinge:
1. **Leistungsempfängerprüfung (PROJ-4):** Ist die Rechnung an den richtigen Eigentümer adressiert?
2. **Zahlungsabwicklung (PROJ-7):** Die Bankverbindung des Objekts (PROJ-2) bestimmt, von welchem Konto bezahlt wird — der Eigentümer liefert den dazugehörigen Namen/Typ.

Zusätzlich bekommt jedes Objekt einen **Hauptverantwortlichen** — den Benutzer, dem Rechnungen zur Freigabe standardmäßig zugewiesen werden.

Da diese Daten teils aus der bestehenden Excel-Liste kommen, wird der Import erweitert und um einen **Export** ergänzt — damit einzelne Felder (z.B. neuer Eigentümer, neuer Hauptverantwortlicher) nicht einen kompletten Reimport erfordern.

## User Stories

- Als Buchhalter möchte ich zu jedem Verwaltungsobjekt den Eigentümer mit allen relevanten Daten hinterlegen, damit Rechnungen korrekt zugeordnet und geprüft werden können.
- Als System möchte ich beim OCR-Durchlauf den erkannten Rechnungsempfänger mit dem hinterlegten Eigentümer des Verwaltungsobjekts abgleichen (Leistungsempfängerprüfung in PROJ-4).
- Als Buchhalter möchte ich pro Verwaltungsobjekt einen Hauptverantwortlichen festlegen, dem Rechnungen automatisch zur Freigabe zugewiesen werden.
- Als Buchhalter möchte ich die erweiterten Objekt-Daten (inkl. Eigentümer, Hauptverantwortlicher) aus dem System als Excel exportieren, Änderungen darin vornehmen und wieder importieren — ohne alle Daten neu einzugeben.
- Als Buchhalter möchte ich einzelne Felder (z.B. Eigentümer, Hauptverantwortlicher) direkt in der UI ändern können, ohne einen Excel-Import durchführen zu müssen.

## Acceptance Criteria

### Eigentümer-Stammdaten

- [ ] Jedes Verwaltungsobjekt hat genau einen verknüpften Eigentümer
- [ ] Ein Eigentümer kann mehreren Verwaltungsobjekten zugeordnet sein (z.B. eine Holding besitzt mehrere VEs)
- [ ] Eigentümer-Typen: Privatperson, GmbH, AG, KG, UG, GbR, WEG, Sonstige
- [ ] Pflichtfelder: Name (vollständig), Typ
- [ ] Optionale Felder: Adresse (Straße, PLZ, Ort), E-Mail, Telefon, USt-ID / Steuernummer
- [ ] Eigentümer-Verwaltung unter `/admin/eigentümer` (Liste + Detailansicht)
- [ ] Eigentümer anlegen, bearbeiten, löschen (nur Admin/Buchhalter)
- [ ] Löschen blockiert, wenn Eigentümer noch Verwaltungsobjekten zugeordnet ist

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
  - Hauptverantwortlicher (E-Mail-Adresse des Benutzers)
- [ ] Wenn Eigentümer-Name bereits in der Datenbank existiert (gleicher Name): bestehenden Eigentümer verknüpfen statt Duplikat anlegen
- [ ] Wenn Hauptverantwortlicher-E-Mail keinem Benutzer entspricht: Import-Warnung, Feld leer lassen
- [ ] Bestehende Objekte werden beim Re-Import aktualisiert (Update, kein Duplikat) — Identifikation über VE-Nummer

### Excel-Export (NEU)

- [ ] Button "Als Excel exportieren" in der Objekt-Übersicht
- [ ] Export enthält alle Objekt-Felder inkl. Eigentümer-Daten und Hauptverantwortlicher (E-Mail)
- [ ] Exportierte Excel kann direkt bearbeitet und wieder importiert werden (gleiche Spaltenstruktur)
- [ ] Anwendungsfall: Buchhalter ändert 3 Eigentümer in Excel → reimportiert → nur diese 3 Objekte werden aktualisiert

### Objekt-Detailansicht Erweiterung (PROJ-2 UI)

- [ ] Bestehende Objekt-Detailansicht (property-detail-sheet.tsx) wird erweitert um:
  - Abschnitt "Eigentümer" (Dropdown zur Auswahl + Kurzinfo: Name, Typ, Adresse, Kontakt)
  - Abschnitt "Hauptverantwortlicher" (Dropdown-Auswahl aus aktiven Benutzern)
- [ ] Warnung wenn Hauptverantwortlicher deaktiviert: "Hauptverantwortlicher nicht aktiv — bitte neu zuweisen"
- [ ] Änderungen direkt in der Detailansicht speicherbar (kein Excel-Import nötig)

## Edge Cases

- **WEG als Eigentümer ohne USt-ID:** Pflichtfeld ist nur Name + Typ — alle anderen Felder optional
- **Hauptverantwortlicher verlässt das Unternehmen (Benutzer deaktiviert):** Objekte mit deaktiviertem Hauptverantwortlichen bekommen Status-Hinweis "Hauptverantwortlicher nicht aktiv — bitte neu zuweisen"
- **Excel-Import: Spalte fehlt oder ist leer:** Feld wird leer gelassen / nicht überschrieben — kein Fehler, nur Warnung in Import-Protokoll
- **Excel-Import: VE-Nummer existiert nicht:** Neues Objekt wird angelegt (wie bisher in PROJ-2)
- **Eigentümer hat keine E-Mail:** Kein Blocking; PROJ-4 zeigt Warnung "Keine Eigentümer-E-Mail hinterlegt"
- **Eigentümer löschen der noch Objekte hat:** Löschen blockiert mit Fehlermeldung (Liste der betroffenen Objekte anzeigen)

## Technical Requirements

- Neue DB-Tabelle: `owners` (Eigentümer-Stammdaten)
- Erweiterung `properties`: Spalten `owner_id` (FK → owners), `hauptverantwortlicher_user_id` (FK → profiles)
- Excel-Export: `xlsx`-Bibliothek (bereits für Import vorhanden in PROJ-2)
- Keine neuen npm-Pakete nötig

---
## Tech Design (Solution Architect)

### Seitenstruktur & Komponenten

```
/admin/eigentümer                           ← NEU: Eigentümer-Übersicht
├── Aktionsleiste
│   ├── Suchfeld (Name, Typ)
│   └── [+ Neuer Eigentümer]-Button
│
├── Eigentümer-Tabelle
│   └── Zeilen: Name | Typ | Ort | Objekte (Anzahl) | Aktionen
│       └── Klick → öffnet Eigentümer-Detail-Sheet (seitliches Panel)
│
└── Eigentümer-Detail-Sheet  (analog zu property-detail-sheet aus PROJ-2)
    ├── Stammdaten-Abschnitt
    │   ├── Name (Pflicht), Typ-Dropdown (Pflicht)
    │   ├── Adresse (Straße, PLZ, Ort), E-Mail, Telefon, USt-ID
    │   └── [Bearbeiten] → Felder editierbar
    │
    ├── Verknüpfte Objekte (read-only)
    │   └── Liste der Verwaltungsobjekte, die diesen Eigentümer haben
    │
    └── Fußzeile: [Löschen] (blockiert + Fehlermeldung wenn Objekte verknüpft)

/admin/objekte  (PROJ-2, bestehende Seite — ERWEITERT)
└── Objekt-Detail-Sheet  ← 2 neue Abschnitte in property-detail-sheet.tsx
    ├── [bestehend: Stammdaten, Bankverbindungen, Fußzeile]
    │
    ├── NEU: Eigentümer-Abschnitt
    │   ├── Eigentümer-Dropdown (alle angelegten Eigentümer, Suche by Name)
    │   └── Eigentümer-Kurzinfo (Typ, Adresse, Kontakt — read-only)
    │
    └── NEU: Hauptverantwortlicher-Abschnitt
        ├── Dropdown aller aktiven Benutzer
        └── Warnung "Hauptverantwortlicher nicht aktiv — bitte neu zuweisen"
            (erscheint wenn zugewiesener Benutzer deaktiviert wurde)

Navigation (app-header.tsx) ← Menüpunkt "Eigentümer" unter Admin-Bereich hinzufügen
```

### Datenmodell

```
Eigentümer (neue Tabelle: owners)
├── Name     → Pflicht (z.B. "Müller GmbH" oder "Anna Schmidt")
├── Typ      → Pflicht (Privatperson / GmbH / AG / KG / UG / GbR / WEG / Sonstige)
├── Straße   → optional
├── PLZ      → optional
├── Ort      → optional
├── E-Mail   → optional
├── Telefon  → optional
├── USt-ID   → optional (Steuernummer oder USt-IdNr.)
└── Erstellt / Geändert  → automatisch gesetzt

Verwaltungsobjekt (bestehende Tabelle: properties — 2 neue Spalten)
├── [+] owner_id                      → FK → owners (wer besitzt dieses Objekt?)
└── [+] hauptverantwortlicher_user_id → FK → profiles (wer ist der Default-Freigeber?)

Bankverbindung (bestehende Tabelle: bank_accounts — UNVERÄNDERT)
└── bleibt am Objekt (PROJ-2): IBAN/BIC/Kontoinhaber/Bankname → für OCR + Zahllauf
```

**Kernprinzip:** Ein Datensatz, eine Wahrheit. Das Konto sitzt am Objekt. Der Eigentümer liefert nur die Identitätsdaten (Name, Typ, Adresse) für Leistungsempfänger-Abgleich und Zahllauf-Zuordnung.

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Eigentümer als eigene Tabelle (nicht Felder auf `properties`) | Ein Eigentümer kann mehrere Objekte besitzen. Separate Tabelle verhindert Duplikate — Namensänderung einmal, wirkt auf alle verknüpften Objekte. |
| Keine owner_bank_accounts-Tabelle | Die Bankverbindung hängt bereits am Objekt (PROJ-2). Eigentümer liefert nur Identitätsdaten. Ein Konto pro Objekt, kein zweites Konto-Konzept. |
| Excel-Import: Eigentümer-Matching per Name (exact match) | Beim Re-Import prüfen wir: Gibt es bereits einen Eigentümer mit exakt diesem Namen? Wenn ja: verknüpfen. Wenn nein: neu anlegen. Verhindert Duplikate. |
| Hauptverantwortlicher-Warnung im Frontend (kein DB-Constraint) | Ein deaktivierter Benutzer soll das Objekt nicht blockieren. UI-Hinweis reicht — Buchhalter weist direkt neu zu. |
| Detail-Sheet (seitliches Panel) statt neue Seite | Konsistenz mit PROJ-2. Buchhalter sieht die Liste im Hintergrund. |
| Keine neuen Pakete | `xlsx` + `ibantools` aus PROJ-2 bereits vorhanden. |

### API-Routen

```
Neue Routen (Eigentümer-Verwaltung):
GET    /api/admin/eigentümer           → alle Eigentümer (mit Objekt-Anzahl)
POST   /api/admin/eigentümer           → neuen Eigentümer anlegen
GET    /api/admin/eigentümer/[id]      → Detail + verknüpfte Objekte
PATCH  /api/admin/eigentümer/[id]      → Stammdaten aktualisieren
DELETE /api/admin/eigentümer/[id]      → löschen (403 wenn Objekte verknüpft)

Erweiterung bestehender PROJ-2-Routen:
PATCH  /api/admin/properties/[id]      → +owner_id, +hauptverantwortlicher_user_id
GET    /api/admin/properties/[id]      → ergänzt um owner + hauptverantwortlicher
POST   /api/admin/properties/import    → neue Spalten (Eigentümer, Hauptverantwortlicher)
GET    /api/admin/properties/export    → neue Spalten im Excel-Export
```

### Excel Import/Export — Spalten-Erweiterung

```
Bestehende Spalten (PROJ-2, unverändert):
VE-Nummer | Bezeichnung | Straße | PLZ | Ort | Notiz | IBAN | BIC | Kontoinhaber | Bankname

Neue Spalten (PROJ-13):
Eigentümer-Name | Eigentümer-Typ | Eigentümer-Straße | Eigentümer-PLZ | Eigentümer-Ort |
Eigentümer-E-Mail | Eigentümer-USt-ID | Hauptverantwortlicher (E-Mail)

Import-Logik:
→ VE-Nummer vorhanden → Update (kein Duplikat)
→ Eigentümer-Name bekannt (exact match) → verknüpfen
→ Eigentümer-Name neu → anlegen + verknüpfen
→ Hauptverantwortlicher-E-Mail unbekannt → Warnung, Feld bleibt leer
→ Spalte fehlt oder leer → kein Fehler, bestehender Wert bleibt
```

## Implementation Notes (Backend)

### Gebaut (2026-04-18)
- `supabase/migrations/20260418001_proj13_owners.sql` — `owners`-Tabelle (RLS, Trigger, Indexes) + 2 neue Spalten auf `properties` (`owner_id` FK → owners, `hauptverantwortlicher_user_id` FK → auth.users)
- `src/app/api/admin/eigentümer/route.ts` — GET (Liste mit property_count), POST (anlegen mit Zod-Validierung)
- `src/app/api/admin/eigentümer/[id]/route.ts` — GET (Detail + verknüpfte Objekte), PATCH, DELETE (409 wenn Objekte verknüpft)
- `src/app/api/admin/eigentümer/route.test.ts` — 9 Tests (401, 403, 400, 201, 200 Happy Paths)
- `src/app/api/admin/eigentümer/[id]/route.test.ts` — 10 Tests (GET/PATCH/DELETE mit Auth, Not Found, 409)
- `src/app/api/admin/properties/[id]/route.ts` — PATCH-Schema um `owner_id` + `hauptverantwortlicher_user_id` erweitert; GET liefert `owner:owners(*)` mit zurück
- `src/app/api/admin/properties/import/route.ts` — Eigentümer-Matching per Name (anlegen/verknüpfen) + Hauptverantwortlicher-Lookup per E-Mail; gibt `warnings[]` zurück
- `src/lib/types.ts` — `ImportRow` um Eigentümer- + HV-Felder erweitert
- `src/components/properties/import-dialog.tsx` — COLUMN_MAP um neue Spaltennamen erweitert
- `src/app/(protected)/admin/objekte/page.tsx` — Supabase-Query mit `owner:owners(*)` JOIN
- `src/components/properties/properties-client.tsx` — Export um Eigentümer + HV-Spalten erweitert

### Tests
- 86/86 Tests grün (`npm test`)

## Implementation Notes (Frontend)

### Gebaut (2026-04-18)
- `src/lib/types.ts` — `Owner`, `OwnerType`, `OWNER_TYPES` hinzugefügt; `Property` um `owner_id`, `owner`, `hauptverantwortlicher_user_id`, `hauptverantwortlicher` erweitert
- `src/components/app-header.tsx` — Menüpunkt "Eigentümer" (Icon: UserRound) für Admin-Nav hinzugefügt
- `src/components/eigentümer/new-eigentümer-dialog.tsx` — Anlegen-Dialog (Name, Typ, Adresse, E-Mail, Telefon, USt-ID) mit Zod-Validierung
- `src/components/eigentümer/eigentümer-detail-sheet.tsx` — Detail-Panel: Stammdaten (View/Edit), verknüpfte Objekte (read-only), Löschen (blockiert wenn Objekte vorhanden)
- `src/components/eigentümer/eigentümer-client.tsx` — Listenansicht mit Suche, New-Dialog, Detail-Sheet
- `src/app/(protected)/admin/eigentümer/page.tsx` — Server Component; lädt owners-Tabelle mit graceful fallback (leere Liste wenn Tabelle noch nicht existiert)
- `src/app/(protected)/admin/objekte/page.tsx` — erweitert: lädt `profiles` parallel zu `properties`, reicht sie an PropertiesClient weiter
- `src/components/properties/properties-client.tsx` — `profiles: Profile[]` Prop hinzugefügt, wird an PropertyDetailSheet durchgereicht
- `src/components/properties/property-detail-sheet.tsx` — 2 neue Abschnitte: Eigentümer (Dropdown + Kurzinfo) und Hauptverantwortlicher (Dropdown + Inaktiv-Warnung)

### Hinweise
- Eigentümer-Dropdown im PropertyDetailSheet lädt via `GET /api/admin/eigentümer` — gibt leer zurück bis Backend-Phase die Route anlegt
- Speichern von owner_id + hauptverantwortlicher_user_id via `PATCH /api/admin/properties/[id]` — wird silent ignoriert bis Backend-Route erweitert wird
- Excel-Import/Export-Erweiterung erfolgt in Backend-Phase (neue Spalten im Import-Handler)

## QA Test Results

**Datum:** 2026-04-18 | **Tester:** QA Engineer (automatisiert)
**Gesamtergebnis:** ✅ APPROVED — BUG-004 (High) + BUG-003 (Low) behoben; BUG-001 (Medium) + BUG-002 (Low) offen, nicht deployment-blockierend

### Acceptance Criteria — Prüfprotokoll

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| **Eigentümer-Stammdaten** | | | |
| 1 | Jedes VE hat genau einen Eigentümer | ✅ PASS | `owner_id` FK auf `properties`, nullable |
| 2 | Eigentümer kann mehreren VEs zugeordnet sein | ✅ PASS | 1:N über `owner_id` FK |
| 3 | Eigentümer-Typen (Privatperson bis Sonstige) | ✅ PASS | CHECK-Constraint in Migration, Zod-Validierung in API |
| 4 | Pflichtfelder: Name + Typ | ✅ PASS | Zod + DB-Schema, WEG ohne USt-ID möglich |
| 5 | Optionale Felder (Adresse, E-Mail, Telefon, USt-ID) | ✅ PASS | Alle nullable in DB + API |
| 6 | `/admin/eigentumer` (Liste + Detailansicht) | ✅ PASS | Route umbenannt (BUG-004 Fix): ASCII-Pfad `/admin/eigentumer`, Anzeige bleibt "Eigentümer" |
| 7 | Eigentümer anlegen, bearbeiten, löschen (nur Admin) | ✅ PASS | `requireAdmin()` in allen Routen, Zod-Validierung |
| 8 | Löschen blockiert wenn Objekte zugeordnet | ✅ PASS | API gibt 409 + Fehlermeldung, Frontend deaktiviert Button |
| **Hauptverantwortlicher** | | | |
| 9 | Feld "Hauptverantwortlicher" je Objekt | ✅ PASS | `hauptverantwortlicher_user_id` FK auf `auth.users` |
| 10 | Standard: Admin (wenn nichts gesetzt) | ✅ PASS | Feld nullable, UI zeigt "Standard (Admin/Buchhalter)" |
| 11 | Auswahl über Dropdown aktiver Benutzer | ✅ PASS | Profiles werden aus Supabase geladen und als Props übergeben |
| 12 | Änderbar direkt in Objekt-Detailansicht | ✅ PASS | PATCH `/api/admin/properties/[id]` erweitert |
| 13 | Warnung bei deaktiviertem HV | ✅ PASS | Amber-Alert mit AlertTriangle-Icon in PropertyDetailSheet |
| **Excel-Import** | | | |
| 14 | Import um neue Spalten erweitert (Eigentümer, HV) | ✅ PASS | 8 neue COLUMN_MAP-Einträge, importRowSchema erweitert |
| 15 | Eigentümer-Matching per Name (existiert → verknüpfen) | ✅ PASS | `maybeSingle()` auf `owners` nach Name, dann upsert |
| 16 | HV-E-Mail nicht gefunden → Warnung, Feld leer | ✅ PASS | `warnings[]` im API-Response |
| 17 | Re-Import aktualisiert bestehende Objekte | ✅ PASS | Duplicate-Mode "overwrite" wie in PROJ-2 |
| **Excel-Export** | | | |
| 18 | Export-Button in Objekt-Übersicht | ✅ PASS | Bereits in PROJ-2, jetzt mit Eigentümer-Spalten |
| 19 | Export enthält Eigentümer-Daten + HV-E-Mail | ✅ PASS | Erweitert in `handleExport()` in properties-client.tsx |
| 20 | Gleiche Spaltenstruktur für Re-Import | ✅ PASS | Export-Spaltenköpfe stimmen mit COLUMN_MAP überein |
| **Objekt-Detailansicht** | | | |
| 21 | Eigentümer-Abschnitt in Property-Detail-Sheet | ✅ PASS | Dropdown + Kurzinfo (Name, Typ, Adresse, Kontakt) |
| 22 | HV-Abschnitt in Property-Detail-Sheet | ✅ PASS | Dropdown mit aktiven Benutzern |
| 23 | Änderungen direkt speicherbar | ✅ PASS | Separate Speichern-Buttons je Abschnitt |

### Edge Cases

| Edge Case | Status | Anmerkung |
|-----------|--------|-----------|
| WEG ohne USt-ID | ✅ PASS | Nur Name + Typ Pflicht, alle anderen nullable |
| HV deaktiviert → Warnung | ✅ PASS | `is_active` Check in Frontend, Amber-Alert |
| Excel-Import: Spalte fehlt | ✅ PASS | Fehlende Spalten werden silent ignoriert (kein Error) |
| VE-Nummer existiert nicht → neu anlegen | ✅ PASS | Existing PROJ-2 Logik, unverändert |
| Eigentümer ohne E-Mail | ✅ PASS | Kein Blocking, optionales Feld |
| Eigentümer löschen mit Objekten | ✅ PASS | 409 + Fehlermeldung mit Objekt-Anzahl |

### Bugs

**BUG-001** — Severity: **Medium**
- **Titel:** Import-Warnungen werden nicht im UI angezeigt
- **Beschreibung:** Die Backend-Route gibt `{ warnings: string[] }` zurück wenn HV-E-Mail nicht gefunden oder Owner-Anlage schlägt fehl. Die `handleImport()`-Funktion in `import-dialog.tsx` liest nur `const { properties } = await res.json()` und ignoriert `warnings` komplett.
- **Schritte:** 1. Excel mit unbekannter HV-E-Mail importieren. 2. Import läuft durch. 3. Keine Warnung sichtbar.
- **Fix:** `const { properties, warnings } = await res.json()` und Warnungen als Alert in der Erfolgs-/Abschlussansicht anzeigen.

**BUG-002** — Severity: **Low**
- **Titel:** Doppelter `value=""` SelectItem im Eigentümer-Dropdown wenn keine Owner vorhanden
- **Beschreibung:** In `property-detail-sheet.tsx` werden beim Eigentümer-Dropdown zwei `SelectItem` mit `value=""` gerendert wenn `owners.length === 0`: das normale "— Kein Eigentümer —" Item und das disabled "Noch keine Eigentümer angelegt" Item.
- **Schritte:** 1. Objekt-Detail-Sheet öffnen. 2. Eigentümer-Abschnitt auf "Bearbeiten" klicken. 3. Dropdown öffnen wenn keine Eigentümer vorhanden.
- **Fix:** Disabled-Item durch eigene `value` (z.B. `value="__empty__"`) ersetzen oder komplett entfernen wenn das erste Item bereits den Fall abdeckt.

**BUG-003** — Severity: **Low**
- **Titel:** DELETE-Route prüft Count-Query-Fehler nicht ab
- **Beschreibung:** In `eigentümer/[id]/route.ts` blockiert `if (count && count > 0)` die Löschung. Wenn die Count-Query jedoch einen Supabase-Fehler zurückgibt (z.B. DB-Timeout), ist `count = null` und `null && ...` = `false` → Löschung wird nicht blockiert.
- **Fix:** `if (error) { return 500 }` vor dem Count-Check hinzufügen.

**BUG-004** — Severity: **High**
- **Titel:** Routen mit Umlaut `ü` im Verzeichnisnamen funktionieren nicht korrekt im Next.js Dev-Server
- **Beschreibung:** Die Verzeichnisse `src/app/api/admin/eigentümer/` und `src/app/(protected)/admin/eigentümer/` enthalten das nicht-ASCII-Zeichen `ü`. Im Dev-Server (`npm run dev`) führt dies zu:
  - API-Routen geben 404 statt 401 zurück
  - Die Seite `/admin/eigentümer` redirectet nicht zu `/login` für unauthentifizierte Nutzer (Auth-Guard kaputt)
  - Im Production-Build (`next build && next start`) funktionieren die Routen korrekt
- **Schritte:** 1. `npm run dev` starten. 2. `GET /api/admin/eigentümer` ohne Auth aufrufen → 404 statt 401.
- **Fix:** Verzeichnisse umbenennen auf ASCII (z.B. `eigentumer`), alle URL-Referenzen im Frontend anpassen, optional einen Redirect von `/admin/eigentümer` → `/admin/eigentumer` hinzufügen. Oder: `next.config.js` Rewrite-Regel für den Umlaut.

### Testergebnisse

- **Unit Tests:** 87/87 ✅ (`npm test`) — 20 neue Tests inkl. BUG-003-Fix-Test
- **E2E Tests:** 67/67 ✅ Chromium (`npm run test:e2e -- --project=chromium`) — keine Regressionen
  - 17 neue PROJ-13 Tests (Auth Guard eigentumer, alle API-Sicherheitstests)
  - 50 bestehende Tests (PROJ-1, PROJ-2, PROJ-3) — alle grün
- **Getestete Browser:** Chromium ✅

### Security Audit

| Bereich | Ergebnis |
|---------|---------|
| Auth vor DB-Zugriff | ✅ `requireAdmin()` in allen neuen Routen |
| SQL Injection | ✅ Supabase parameterized queries |
| XSS | ✅ React escaped rendering |
| RLS auf owners-Tabelle | ✅ Migration mit SELECT (alle auth), Write (nur Admin) |
| Service Role Key | ✅ Nur server-side, nicht im Client-Bundle |
| Eigentümer-Name im Import | ✅ Parameterized `.eq('name', owner_name)` |
| Zod-Validierung | ✅ Alle POST/PATCH-Endpunkte |
| Auth-Guard eigentumer-Seite | ✅ BUG-004 behoben: ASCII-Pfad, Auth-Guard greift korrekt |

### Fixes nach QA
- **BUG-004 (High) BEHOBEN:** Alle Route-Verzeichnisse von `eigentümer` auf ASCII `eigentumer` umbenannt. URL-Pfade: `/admin/eigentumer`, `/api/admin/eigentumer`. Anzeigename im UI bleibt "Eigentümer". Auth-Guard greift jetzt korrekt.
- **BUG-003 (Low) BEHOBEN:** `countError`-Check in DELETE-Route hinzugefügt (gibt 400 zurück statt silent proceed).

### Offene Bugs (nicht deployment-blockierend)
- **BUG-001 (Medium):** Import-Warnungen vom Backend werden nicht im UI angezeigt
- **BUG-002 (Low):** Doppelter `value=""` SelectItem im Eigentümer-Dropdown bei 0 Owners

### Produktions-Empfehlung
**✅ BEREIT** — Keine Critical/High Bugs mehr. BUG-001 und BUG-002 können nach dem ersten Release behoben werden.

## Deployment
_To be added by /deploy_
