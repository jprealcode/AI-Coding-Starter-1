# Product Requirements Document

## Vision
Ein digitaler Eingangsrechnungs-Workflow für professionelle Hausverwaltungen. Das System erfasst Rechnungen automatisch aus Gmail und Eingangsordnern, erkennt alle relevanten Metadaten via intelligenter OCR-Pipeline (ZUGFeRD → Native → ocrmypdf → Claude Vision) und führt sie durch einen strukturierten Freigabe-Workflow bis zum SEPA-Zahllauf — mit vollständiger DATEV-Anbindung und Google Drive-Archivierung.

## Target Users

### Primär: Buchhalterin / Admin
- Verantwortlich für den gesamten Rechnungsprozess
- Legt Benutzer an, weist Rechnungen zur Freigabe zu
- Führt den Zahllauf durch und exportiert DATEV-Buchungen
- Sieht alle Rechnungen, alle Objekte, alle Status

### Sekundär: Mitarbeiter (Freigeber, 4–6 Personen)
- Sehen nur ihnen zugewiesene Rechnungen
- Können Rechnungen freigeben oder mit Konflikt zurückgeben
- Müssen bei Konflikt eine Notiz hinterlassen

### Kontext: Hausverwaltung
- 20–100 Verwaltungsobjekte (Liegenschaften)
- Verschiedene Bankverbindungen je Objekt
- Eingehende Rechnungen per E-Mail, Post (Scan) und E-Rechnung (ZUGFeRD)

## Core Features (Roadmap)

| Priorität | Feature | Status |
|-----------|---------|--------|
| P0 (MVP) | PROJ-1: Authentifizierung & Benutzerverwaltung | Planned |
| P0 (MVP) | PROJ-2: Verwaltungsobjekte & Stammdaten | Planned |
| P0 (MVP) | PROJ-3: Rechnungseingang — Quellen | Planned |
| P0 (MVP) | PROJ-4: PDF-Klassifizierung & OCR-Pipeline | Planned |
| P0 (MVP) | PROJ-5: Dashboard & Rechnungsindex | Planned |
| P0 (MVP) | PROJ-6: Freigabe-Workflow | Planned |
| P0 (MVP) | PROJ-7: Zahllauf & SEPA-XML-Export | Planned |
| P1 | PROJ-8: Kontierung & Buchungsvorbereitung | Planned |
| P1 | PROJ-9: DATEV UNTERNEHMEN online API | Planned |
| P1 | PROJ-10: Google Drive Ablage | Planned |
| P2 | PROJ-11: CSV/ERP-Export | Planned |
| P0 (MVP) | PROJ-12: Kreditoren-Stammdaten (Kreditoren-Kartei) | Planned |
| P0 (MVP) | PROJ-13: Eigentümer-Stammdaten & Objekt-Erweiterung | Planned |

## Success Metrics
- Rechnungserfassung: < 2 Minuten von Eingang bis Dashboard-Anzeige
- OCR-Erkennungsrate: > 90% der Pflichtfelder automatisch befüllt
- Freigabe-Durchlaufzeit: Transparenz durch Statustracking in Echtzeit
- Zahllauf: SEPA-XML fehlerfrei von gängiger Banking-Software lesbar
- Null Doppelzahlungen durch automatische Duplikatsprüfung

## Constraints
- Hosting: Vercel (Frontend) + Supabase (Datenbank, Auth, Storage)
- Benutzeranzahl: 4–6 Mitarbeiter + 1 Admin/Buchhalter
- Verwaltungsobjekte: 20–100 Liegenschaften
- Kontenrahmen: SKR03 und SKR04 (beide hinterlegt, Buchhalter wählt pro Objekt)
- DATEV-Anbindung: DATEV UNTERNEHMEN online API
- OCR-Stack: ocrmypdf (Bild-PDFs) + Claude Vision API (Fallback)
- E-Rechnung: ZUGFeRD-Standard (XML-eingebettete Daten)

## Non-Goals (diese Version)
- Mobile App (reine Web-Applikation)
- Automatische Kontierung ohne Buchhalter-Prüfung
- Mehrere Mandanten / Multi-Tenancy
- Automatischer Zahlungsversand (kein direktes Online-Banking — nur SEPA-XML-Export)
- Vollautomatische DATEV-Übernahme ohne manuelle Freigabe
