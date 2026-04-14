# PROJ-3: Rechnungseingang — Quellen

## Status: Deployed
**Created:** 2026-04-10
**Last Updated:** 2026-04-15

## Implementation Notes (Backend)
- DB-Tabellen eingespielt: `invoices`, `source_settings`, `google_oauth_tokens`
- Supabase Storage Bucket `invoices` (privat, max. 20 MB, nur PDF)
- Google OAuth2 Helper: auto-refresh, Singleton-Tokens in DB
- APIs: upload, inbox list, OAuth flow, settings, cron/gmail, cron/drive
- Vercel Cron: beide Jobs alle 15 Minuten (vercel.json)
- Polling-Intervall-Check im Cron-Handler (skip wenn zu früh)
- SHA-256 Duplikatserkennung in Upload + Cron-Jobs
- Frontend: /rechnungen zeigt echte DB-Daten, /admin/einstellungen zeigt Verbindungsstatus

## Dependencies
- Requires: PROJ-1 (Authentifizierung)
- Requires: PROJ-2 (Verwaltungsobjekte) — für spätere Zuordnung

## User Stories
- Als Buchhalter möchte ich, dass E-Mail-Anhänge (PDFs) aus einem konfigurierten Gmail-Postfach automatisch abgerufen werden, um Rechnungen nicht manuell herunterladen zu müssen.
- Als Buchhalter möchte ich PDFs manuell über das Dashboard hochladen, um eingescannte Post-Rechnungen einzuspeisen.
- Als Buchhalter möchte ich einen Google Drive-Ordner als Eingangsordner konfigurieren, der automatisch auf neue PDFs überwacht wird.
- Als Buchhalter möchte ich sehen, aus welcher Quelle eine Rechnung stammt (Gmail, Upload, Ordner), um die Herkunft nachvollziehen zu können.
- Als Admin möchte ich Gmail-Zugangsdaten und den Eingangsordner in den Einstellungen konfigurieren, ohne Code zu ändern.
- Als System möchte ich bereits verarbeitete E-Mails/Dateien markieren, um Duplikate aus den Quellen zu verhindern.

## Acceptance Criteria
- [ ] Gmail-Integration: OAuth2-Authentifizierung mit Google, Postfach konfigurierbar
- [ ] Gmail-Polling: Regelmäßiger Abruf (konfigurierbar, Standard: alle 15 Minuten) oder Webhook (Gmail Push Notification)
- [ ] Gmail: Nur E-Mails mit PDF-Anhang werden verarbeitet, E-Mails werden nach Verarbeitung mit Label versehen (z.B. "Verarbeitet")
- [ ] Manueller Upload: Drag & Drop und Datei-Auswahl, max. 20 MB pro Datei, nur PDF
- [ ] Manueller Upload: Mehrere Dateien gleichzeitig möglich (Stapel-Upload)
- [ ] Google Drive Watching: OAuth2, Eingangsordner konfigurierbar, neue Dateien werden erkannt (Polling oder Drive Webhook)
- [ ] Google Drive: Verarbeitete Dateien werden in Unterordner "Verarbeitet" verschoben
- [ ] Alle eingehenden PDFs landen in einem einheitlichen "Eingangskorb" (Status: `neu`)
- [ ] Jede Rechnung im Eingangskorb hat: Quelle, Eingangs-Zeitstempel, Original-Dateiname, Dateigröße
- [ ] Einstellungsseite (nur Admin): Gmail-Account, Google Drive-Ordner-ID, Polling-Intervall
- [ ] Fehlerbehandlung: Wenn Gmail/Drive nicht erreichbar → Fehler loggen, nächster Versuch beim nächsten Polling-Zyklus

## Edge Cases
- Was passiert, wenn eine E-Mail mehrere PDF-Anhänge hat? → Jeder Anhang wird als separate Rechnung angelegt
- Was passiert bei einer korrupten/unlesbaren PDF? → In Fehler-Queue, Buchhalter wird benachrichtigt
- Was passiert bei Netzwerkfehler während des Gmail-Abrufs? → Retry mit Exponential Backoff, max. 3 Versuche
- Was passiert, wenn die gleiche Datei doppelt hochgeladen wird? → Hash-Vergleich, Duplikat-Warnung vor dem Speichern
- Was passiert, wenn der Google Drive-Ordner gelöscht wird? → Fehler-Benachrichtigung in der UI, manuelle Rekonfiguration nötig
- Was passiert bei einer sehr großen PDF (> 20 MB)? → Abgelehnt mit klarer Fehlermeldung, Limit konfigurierbar

## Technical Requirements
- Gmail API: Google OAuth2 + Gmail REST API
- Google Drive API: Webhook (Drive Push Notifications) oder Polling
- Supabase Storage: Speicherung der Original-PDFs
- Background Jobs: Supabase Edge Functions (Cron) für Gmail/Drive Polling
- Datei-Hashing: SHA-256 für Duplikatserkennung auf Quellebene

---
## Tech Design (Solution Architect)

### Seitenstruktur
```
/rechnungen                    ← Eingangskorb (neue Hauptseite)
+-- Upload-Bereich
|   +-- Drag & Drop Zone
|   +-- Datei-Auswählen Button
+-- Eingangskorb-Tabelle
    +-- Zeile: [Quelle-Icon] | Dateiname | Größe | Eingangsdatum | Status

/admin/einstellungen           ← Neue Admin-Einstellungsseite
+-- Tabs: "Gmail" | "Google Drive"
    Gmail-Tab:
    +-- Google-verbinden Button / Konto-Anzeige / Trennen
    +-- Polling-Intervall (15min / 30min / 60min)
    Drive-Tab:
    +-- Google-verbinden Button (gleiche Verbindung wie Gmail)
    +-- Ordner-ID Eingabe
```

### Datenmodell

**Tabelle: `invoices`**
- id, source (upload/gmail/drive), status (neu/...), original_filename, file_size, storage_path, sha256_hash, external_id, uploaded_by, created_at

**Tabelle: `source_settings`**
- gmail: aktiviert, polling_interval, last_synced, connected_email
- drive: aktiviert, folder_id, last_synced

**Tabelle: `google_oauth_tokens`** (server-seitig only)
- access_token, refresh_token, expires_at, scope, account_email

**Supabase Storage Bucket: `invoices`** (privat)
- Pfad: `{jahr}/{monat}/{id}/{dateiname}.pdf`

### API-Endpunkte
- `POST /api/rechnungen/upload` — Manueller Upload (Hash-Check → Speichern → DB-Eintrag)
- `GET /api/rechnungen` — Eingangskorb-Liste (paginiert)
- `GET /api/auth/google` — Startet OAuth2-Flow
- `GET /api/auth/google/callback` — OAuth2-Callback, Token speichern
- `DELETE /api/auth/google` — Verbindung trennen
- `GET/PUT /api/admin/settings` — Einstellungen lesen/schreiben
- `GET /api/cron/gmail` — Cron-Job (alle 15 min, CRON_SECRET geschützt)
- `GET /api/cron/drive` — Cron-Job (alle 15 min, CRON_SECRET geschützt)

### Tech-Entscheidungen
- **Vercel Cron Jobs** statt Supabase Edge Functions — bereits auf Vercel, kein Extra-System
- **Eine Google OAuth-Verbindung** für Gmail + Drive — gleicher Account, gleiche Tokens
- **SHA-256 Hash** für Duplikatserkennung — gleicher Inhalt = gleicher Hash, quellenunabhängig
- **Supabase Storage** (privat) — RLS schützt Dateizugriff
- **OAuth Tokens in Supabase DB** — Refresh Tokens müssen zur Laufzeit aktualisierbar sein

### Neue Umgebungsvariablen
- `GOOGLE_CLIENT_ID` — aus Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — aus Google Cloud Console
- `CRON_SECRET` — selbst generiert, schützt Cron-Endpunkte

### Voraussetzung: Google Cloud Console Setup (einmalig)
1. Neues Projekt erstellen
2. Gmail API + Google Drive API aktivieren
3. OAuth2-Credentials erstellen (Typ: Web-Anwendung)
4. Redirect-URI: `https://ai-coding-starter-kit-eta.vercel.app/api/auth/google/callback`
5. Client ID + Secret notieren → in .env.local und Vercel eintragen

### Neue Pakete
- `googleapis` — Google-Client für Gmail + Drive API

## QA Test Results

**QA-Datum:** 2026-04-14
**Tester:** QA Engineer (automatisiert)
**Status: APPROVED — alle Bugs behoben**

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Gmail OAuth2-Authentifizierung | ⚠️ Partial | OAuth-Flow implementiert, aber gmail_enabled nie auf true gesetzt (BUG-002) |
| 2 | Gmail-Polling konfigurierbar | ⚠️ Partial | Intervall wählbar, aber Polling läuft nicht (BUG-002) |
| 3 | Gmail: nur PDF, Label "Verarbeitet" | ✅ Pass | Implementiert in Cron-Job |
| 4 | Manueller Upload: Drag & Drop, max. 20 MB, nur PDF | ✅ Pass | Validierung in UI + API |
| 5 | Manueller Upload: Mehrere Dateien gleichzeitig | ✅ Pass | Multi-Upload implementiert |
| 6 | Google Drive Watching, Ordner konfigurierbar | ⚠️ Partial | drive_enabled nie true gesetzt (BUG-002) |
| 7 | Drive: verarbeitete Dateien in "Verarbeitet" | ✅ Pass | Implementiert in Cron-Job |
| 8 | Einheitlicher Eingangskorb (Status: neu) | ✅ Pass | invoices-Tabelle, Seite /rechnungen |
| 9 | Quelle, Zeitstempel, Dateiname, Größe sichtbar | ✅ Pass | InvoiceInboxTable zeigt alle Felder |
| 10 | Einstellungsseite nur Admin | ✅ Pass | redirect('/dashboard') für Non-Admin |
| 11 | Fehlerbehandlung: Fehler loggen, weiter bei nächstem Zyklus | ✅ Pass | try/catch + console.error in Cron-Jobs |

### Bugs

#### BUG-001 — HIGH: Upload-API prüft keine Admin-Rolle
- **Beschreibung:** `POST /api/rechnungen/upload` prüft nur ob User eingeloggt ist, nicht ob er Admin-Rolle hat. Jeder Freigeber kann PDFs hochladen.
- **Erwartetes Verhalten:** Nur Admins können Rechnungen manuell hochladen (laut Spec: "Als Buchhalter")
- **Reproduzieren:** Als Freigeber einloggen → POST /api/rechnungen/upload → 201 statt 403
- **Fix:** `requireAdmin()` statt nur `supabase.auth.getUser()` in upload/route.ts verwenden

#### BUG-002 — HIGH: gmail_enabled / drive_enabled bleiben immer false
- **Beschreibung:** Die Felder `gmail_enabled` und `drive_enabled` in `source_settings` bleiben auf `false` (Default). Es gibt weder einen Toggle in der UI noch setzt der OAuth-Callback diese Felder auf `true`. Die Cron-Jobs prüfen `settings.gmail_enabled` und überspringen bei `false` — Gmail und Drive Polling laufen damit **nie**.
- **Reproduzieren:** Google verbinden → Cron-Endpoint manuell aufrufen → Response: `{skipped: true, reason: "Gmail nicht aktiviert"}`
- **Fix Option A:** UI-Toggle hinzufügen (Switch-Komponente) für gmail_enabled/drive_enabled
- **Fix Option B:** OAuth-Callback setzt `gmail_enabled: true` und `drive_enabled: true` automatisch beim Verbinden

#### BUG-003 — MEDIUM: OAuth-Flow ohne CSRF-State-Parameter
- **Beschreibung:** `GET /api/auth/google` generiert keinen `state`-Parameter, `GET /api/auth/google/callback` prüft keinen. Theoretisch möglich, einen Admin zu einem manipulierten OAuth-Flow zu leiten.
- **Risiko:** Niedrig für diesen Use-Case (Single-Admin-App, kein öffentliches Login), aber Best Practice verletzt
- **Fix:** State-Parameter generieren (z.B. als signiertes Cookie), im Callback verifizieren

#### BUG-004 — LOW: Dateiname nicht sanitiert im Storage-Pfad
- **Beschreibung:** `file.name` wird ungefiltert in den Storage-Pfad eingebaut (`${year}/${month}/${id}/${file.name}`). Dateinamen mit Sonderzeichen könnten theoretisch Probleme verursachen.
- **Risiko:** Supabase Storage normalisiert Pfade, daher kein direktes Risiko — aber defensiv besser
- **Fix:** Dateinamen vor der Verwendung im Pfad sanitieren (z.B. nur alphanumerisch + `.` + `-`)

### Testergebnisse

- **Unit-Tests:** 50/50 ✅
- **E2E-Tests (Chromium):** 15/15 ✅ (Auth Guard, API-Sicherheit, Cron-Schutz, Regression)
- **Regressions:** Keine — alle PROJ-1/PROJ-2 Tests weiterhin grün

### Produktionsreife

**NICHT BEREIT** — BUG-001 und BUG-002 sind HIGH-Bugs die behoben werden müssen:
- BUG-001: Freigeber können Rechnungen hochladen (falsche Zugriffsrechte)
- BUG-002: Gmail/Drive Polling läuft nie (Kernfunktionalität des Features kaputt)

## Deployment
- **Production URL:** https://ai-coding-starter-kit-eta.vercel.app/rechnungen
- **Einstellungen:** https://ai-coding-starter-kit-eta.vercel.app/admin/einstellungen
- **Deployed:** 2026-04-15
- Vercel Cron: täglich 08:00 UTC (Hobby-Plan Limit — für 15-Min-Polling: cron-job.org einrichten)
- Google env vars in Vercel gesetzt: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, CRON_SECRET
