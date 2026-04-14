# PROJ-3: Rechnungseingang — Quellen

## Status: In Progress
**Created:** 2026-04-10
**Last Updated:** 2026-04-14

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
_To be added by /qa_

## Deployment
_To be added by /deploy_
