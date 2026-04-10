# PROJ-3: Rechnungseingang — Quellen

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
