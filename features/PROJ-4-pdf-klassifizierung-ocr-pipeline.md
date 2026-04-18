# PROJ-4: PDF-Klassifizierung & OCR-Pipeline

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-18

## Dependencies
- Requires: PROJ-2 (Verwaltungsobjekte) — Objekte & Eigentümer für Zuordnung und Leistungsempfängerprüfung
- Requires: PROJ-3 (Rechnungseingang) — PDFs kommen aus dem Eingangskorb
- Requires: PROJ-12 (Kreditoren-Stammdaten) — Kreditoren-Abgleich und Kurzname für Dateiname

## Grundprinzip: Buchhalter hat immer die Hoheit
Unabhängig vom OCR-Ergebnis, unabhängig vom Konflikt-Status — der Buchhalter kann jederzeit alle Felder manuell setzen und die Rechnung durch den Workflow führen. Es gibt **keine Hard Blocks**. Dieses Prinzip gilt für alle Benutzer mit Freigabe-Berechtigung. Hintergrund: Viele bestehende Lieferanten werden zu Beginn nicht sauber erkannt; der Betrieb muss trotzdem weiterlaufen.

## User Stories

- Als System möchte ich automatisch erkennen, ob eine PDF eine ZUGFeRD-E-Rechnung, eine maschinell erstellte PDF oder eine eingescannte Bild-PDF ist, um die optimale Extraktionsmethode zu wählen.
- Als System möchte ich bei ZUGFeRD-Rechnungen alle Metadaten direkt aus dem eingebetteten XML extrahieren, ohne OCR zu benötigen.
- Als System möchte ich bei maschinell erstellten PDFs den Text-Layer direkt auslesen, um schnell und kostengünstig Metadaten zu gewinnen.
- Als System möchte ich bei Bild-PDFs Tesseract.js (OCR) einsetzen, um einen Text-Layer zu erzeugen, bevor weitere Extraktion erfolgt.
- Als System möchte ich Claude Vision API als Fallback nutzen, wenn die Metadaten nach den vorherigen Schritten unvollständig sind.
- Als System möchte ich das tatsächliche Leistungsobjekt aus dem Rechnungsinhalt erkennen (nicht nur die Empfängeradresse oben links), um auch bei Holding- und Verwaltungsadressen das richtige Verwaltungsobjekt zuzuordnen.
- Als System möchte ich prüfen, ob der formale Rechnungsempfänger mit dem Eigentümer des zugeordneten Verwaltungsobjekts übereinstimmt (Leistungsempfängerprüfung).
- Als Buchhalter möchte ich bei einem Konflikt (Objekt nicht erkannt / Leistungsempfänger falsch) mit einem Klick das richtige Objekt manuell auswählen und die Rechnung trotzdem weiterschicken.
- Als Buchhalter möchte ich eine Rechnung direkt über Gmail an den Kreditor zurücksenden (z.B. falscher Empfänger, Bitte um ZUGFeRD-Format), ohne die App zu verlassen.
- Als Buchhalter möchte ich nach dem OCR-Durchlauf sofort den vorgeschlagenen Dateinamen sehen, damit ich kontrollieren kann, ob alle Felder korrekt erkannt wurden.
- Als Buchhalter möchte ich die Vision-KI manuell erneut auslösen können ("Erneut per AI erkennen"), wenn das erste Ergebnis unvollständig war.
- Als Admin möchte ich in den Einstellungen das Vision-KI-Modell wechseln können, damit ich bei Bedarf zwischen verfügbaren Modellen wählen kann.

## Acceptance Criteria

### Pipeline-Stufen

- [ ] **Stufe 1 — PDF-Typ-Erkennung:**
  - ZUGFeRD: Prüfung auf eingebettete XML-Datei (ZUGFeRD 1.x / 2.x / XRechnung)
  - Native PDF: Text-Layer vorhanden (Text-Extraktion liefert > 50 sinnvolle Zeichen)
  - Bild-PDF: Kein oder minimaler Text-Layer (< 50 Zeichen extrahierbar)

- [ ] **Stufe 2 — ZUGFeRD-Extraktion:**
  - XML parsen nach: Rechnungsnummer, Datum, Fälligkeitsdatum, Beträge (netto/brutto/MwSt), Lieferant (Name, Adresse, IBAN), Empfänger
  - Konfidenz: 100% (strukturierte Daten)
  - Fehlerfall (XML ungültig/unvollständig): Fallback auf Stufe 3

- [ ] **Stufe 3 — Native PDF Extraktion:**
  - Text-Layer per `pdf-parse` extrahieren
  - Regex + Heuristiken für: Rechnungsnummer, Datum, Betrag, IBAN, Lieferantenname
  - Konfidenz-Score pro Feld (0–100%)

- [ ] **Stufe 4 — Bild-PDF: Tesseract.js OCR:**
  - Tesseract.js mit Sprache Deutsch (deu), läuft direkt in Vercel (kein separater Service)
  - Ergebnis: erkannter Text → weiter wie Stufe 3
  - Fehlerfall (Scan zu schlecht): direkt zu Stufe 5

- [ ] **Stufe 5 — Claude Vision Fallback:**
  - Wird ausgelöst wenn Pflichtfelder (Betrag, Datum, Lieferant) nach Stufe 3/4 fehlen
  - Verwendetes Modell: konfigurierbar in Admin-Einstellungen (Standard: `claude-sonnet-4-6`)
  - Claude Vision analysiert PDF-Seite als Bild und liefert strukturierten JSON-Output

### Kontextbasierte Objekt-Erkennung (zwei Extraktionen)

- [ ] **Extraktion ①  — Formaler Rechnungsempfänger** (oben links auf der Rechnung):
  - Name, Adresse des formalen Adressaten
  - Wird gespeichert, aber **nicht** für die Objekt-Zuordnung verwendet
  
- [ ] **Extraktion ② — Leistungsobjekt aus Rechnungsinhalt** (NEU):
  - Claude Vision / Regex liest den Rechnungsinhalt: "Für welches Objekt / welche Entität ist diese Leistung erbracht?"
  - Kann stehen als: Objektbezeichnung, Straße in Leistungsbeschreibung, WEG-Bezeichnung, Projektnummer
  - Ergebnis wird gegen Verwaltungsobjekte abgeglichen (VE-Nummer, Adresse, Bezeichnung)
  - Hintergrund: Holding und Hausverwaltung teilen dieselbe Verwaltungsanschrift — nur der Rechnungsinhalt unterscheidet, für wen die Leistung erbracht wurde

- [ ] Konfidenz-Score für Objekt-Zuordnung: exakt (100%), Fuzzy-Match (50–99%), kein Match (0%)

### Leistungsempfängerprüfung (NEU)

- [ ] Nach erfolgreicher Objekt-Zuordnung: Formaler Rechnungsempfänger (Extraktion ①) wird gegen den Eigentümer des zugeordneten Verwaltungsobjekts (aus PROJ-2) verglichen
- [ ] Bei Übereinstimmung: Status bleibt `erkannt`
- [ ] Bei Abweichung: Status `konflikt`, Konflikt-Typ `leistungsempfaenger_falsch`
- [ ] Bei keiner Objekt-Zuordnung: Status `konflikt`, Konflikt-Typ `objekt_nicht_erkannt`

### Konflikt-Handling

- [ ] Folgende Konflikt-Typen werden unterschieden und angezeigt:

  | Konflikt-Typ | Angezeigter Hinweis |
  |---|---|
  | `objekt_nicht_erkannt` | "Kein Verwaltungsobjekt konnte zugeordnet werden" |
  | `leistungsempfaenger_falsch` | "Rechnungsempfänger stimmt nicht mit dem Eigentümer überein" |
  | `adresse_unvollstaendig` | "Adresse nur teilweise erkannt — bitte prüfen" |
  | `pdf_qualitaet` | "Scan-Qualität zu gering für automatische Erkennung" |

- [ ] Bei jedem Konflikt-Typ stehen dem Buchhalter folgende Aktionen zur Verfügung:
  - **Objekt manuell auswählen** (Dropdown aller Verwaltungsobjekte) — löst den Konflikt intern
  - **An Kreditor zurücksenden** (Dropdown mit Standardschreiben, via Gmail)
  - **Trotzdem weiterverarbeiten** — Buchhalter setzt alle Felder manuell und schickt die Rechnung durch den Workflow (keine Blockade)

### Rücksende-E-Mail via Gmail (NEU)

- [ ] E-Mail-Versand über den bestehenden Gmail OAuth-Token der Hausverwaltung (aus PROJ-3)
- [ ] Drei Standardschreiben zur Auswahl:
  1. "Leistungsempfänger falsch — Rechnung kann nicht bezahlt werden"
  2. "Bitte Rechnung als E-Mail / ZUGFeRD-Format zusenden"
  3. Freier Text (eigene Formulierung durch Buchhalter)
- [ ] Vorschau der E-Mail vor dem Versand
- [ ] Wenn Kreditor keine E-Mail in Kartei (PROJ-12) hat: Warnung + manuelle Eingabe möglich
- [ ] Gesendete E-Mail wird in Gmail "Gesendet" archiviert (kein separates Logging nötig)

### Dateiname-Vorschau (NEU)

- [ ] Nach dem OCR-Durchlauf wird der vorgeschlagene Dateiname direkt in der Detailansicht angezeigt
- [ ] Format: `JJJJ-MM-TT_VE-NR_KREDITOR-KURZNAME_RE-NR_BETRAG.pdf`
  - Beispiel: `2026-04-18_VE042_VATTENFALL_RE-2024-0815_1250,00.pdf`
- [ ] Dateiname wird als Vorschau angezeigt, ist editierbar
- [ ] Wenn Felder fehlen (z.B. Kurzname aus PROJ-12 nicht bestätigt): betroffener Teil wird als `_UNBEKANNT_` dargestellt

### "Erneut per AI erkennen" (NEU)

- [ ] Button in der Rechnungs-Detailansicht: `[🔄 Erneut per AI erkennen]`
- [ ] Löst ausschließlich Stufe 5 (Claude Vision) neu aus — die zuvor erkannten Felder werden überschrieben
- [ ] Status wechselt während Verarbeitung zu `wird_verarbeitet`
- [ ] Verwendetes Modell: dasjenige, das aktuell in den Admin-Einstellungen hinterlegt ist

### Admin-Einstellungen: KI-Modell (NEU)

- [ ] In `/admin/einstellungen` neuer Abschnitt "OCR & KI-Erkennung":
  - **Vision-Modell** (Stufe 5 Fallback): Dropdown-Auswahl (claude-sonnet-4-6, claude-opus-4-7, …)
  - **OCR-Sprache** (Tesseract.js): Deutsch (Standard), Englisch, Deutsch + Englisch
- [ ] Änderung wirkt sich auf alle zukünftigen Verarbeitungen aus (nicht rückwirkend)

### Allgemein

- [ ] Manuelle Korrektur: alle erkannten Felder sind jederzeit editierbar — für Buchhalter und zugewiesene Bearbeiter
- [ ] Verarbeitungs-Status: `ausstehend` → `wird_verarbeitet` → `erkannt` / `teilweise_erkannt` / `konflikt` / `fehler`
- [ ] Echtzeit-Status-Update im Browser (Supabase Realtime) — kein manuelles Neuladen
- [ ] Verarbeitungszeit-Logging pro Stufe (für Debugging)
- [ ] Nur erste 3 Seiten bei PDFs > 20 Seiten (Performance)

## Extrahierte Metadaten (vollständig)

| Feld | Quelle | Pflicht |
|---|---|---|
| `rechnungsnummer` | OCR | Ja |
| `rechnungsdatum` | OCR | Ja |
| `faelligkeitsdatum` | OCR | Nein |
| `nettobetrag` | OCR | Ja |
| `mwst_satz` | OCR | Nein |
| `mwst_betrag` | OCR | Nein |
| `bruttobetrag` | OCR | Ja |
| `lieferant_name` | OCR | Ja |
| `lieferant_adresse` | OCR | Nein |
| `lieferant_iban` | OCR | Nein |
| `kreditor_id` | PROJ-12 Abgleich | Nein |
| `formaler_empfaenger` | OCR (Extraktion ①) | Nein |
| `leistungsobjekt_referenz` | OCR (Extraktion ②) | Nein |
| `property_id` | Objekt-Zuordnung | Nein |
| `leistungsempfaenger_geprueft` | Leistungsempfängerprüfung | Ja |
| `konflikt_typ` | Pipeline | Nein |
| `pdf_typ` | Pipeline | Ja |
| `extraction_method` | Pipeline | Ja |
| `confidence_score` | Pipeline | Ja |
| `field_confidence` | Pipeline (JSON) | Ja |
| `vorgeschlagener_dateiname` | Pipeline | Nein |

## Edge Cases

- **Holding und Hausverwaltung haben dieselbe Anschrift:** Objekt-Erkennung basiert auf Rechnungsinhalt (Extraktion ②), nicht auf Empfängeradresse — Claude Vision liest den Kontext der Leistungsbeschreibung
- **ZUGFeRD-XML fehlerhaft/unvollständig:** Fallback auf Stufe 3 (Native PDF), Fehler geloggt
- **Tesseract.js liefert unlesbares Ergebnis (sehr schlechter Scan):** Direkt zu Stufe 5 (Claude Vision)
- **Sammelrechnung (mehrere Rechnungsnummern/Beträge):** Erster erkannter Wert + Markierung "Sammelrechnung — manuelle Prüfung"
- **Kein Verwaltungsobjekt erkennbar:** Konflikt-Typ `objekt_nicht_erkannt`; Buchhalter wählt manuell oder sendet zurück — kein Hard Block
- **Leistungsempfänger ≠ Eigentümer:** Konflikt-Typ `leistungsempfaenger_falsch`; Buchhalter entscheidet — kein Hard Block
- **Kreditor hat keine E-Mail:** Rücksende-Funktion zeigt Warnung, manuelle Eingabe möglich
- **Claude Vision API nicht erreichbar:** Status `fehler`, Retry nach 1 Stunde; Buchhalter kann manuell eingreifen
- **PDF > 20 Seiten:** Nur erste 3 Seiten verarbeitet; Hinweis in Detailansicht
- **Kurzname (PROJ-12) noch nicht bestätigt:** Dateiname zeigt `_UNBEKANNT_` an der Stelle; Drive-Upload (PROJ-10) blockiert bis bestätigt

## Technical Requirements

- ZUGFeRD-Parsing: `fast-xml-parser` (XPath auf eingebettete XML)
- Native PDF: `pdf-parse`
- OCR: `tesseract.js` (Node.js, kein separater Service, Deutsch/Englisch)
- Claude Vision: Anthropic API, Modell konfigurierbar (Standard: `claude-sonnet-4-6`)
- E-Mail-Versand: Gmail OAuth-Token aus PROJ-3 (kein separater Mail-Service)
- Verarbeitung: Vercel API Route (async, fire-and-forget nach Upload)
- Echtzeit-Updates: Supabase Realtime
- Sprache OCR: Deutsch (Standard) + optional Englisch

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
