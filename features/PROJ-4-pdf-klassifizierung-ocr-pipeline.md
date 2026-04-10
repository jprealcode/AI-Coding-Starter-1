# PROJ-4: PDF-Klassifizierung & OCR-Pipeline

## Status: Planned
**Created:** 2026-04-10
**Last Updated:** 2026-04-10

## Dependencies
- Requires: PROJ-2 (Verwaltungsobjekte) — für Objekt-Zuordnung bei Erkennung
- Requires: PROJ-3 (Rechnungseingang) — PDFs kommen aus dem Eingangskorb

## User Stories
- Als System möchte ich automatisch erkennen, ob eine PDF eine ZUGFeRD-E-Rechnung, eine maschinell erstellte PDF oder eine eingescannte Bild-PDF ist, um die optimale Extraktionsmethode zu wählen.
- Als System möchte ich bei ZUGFeRD-Rechnungen alle Metadaten direkt aus dem eingebetteten XML extrahieren, ohne OCR zu benötigen.
- Als System möchte ich bei maschinell erstellten PDFs den Text-Layer direkt auslesen, um schnell und kostengünstig Metadaten zu gewinnen.
- Als System möchte ich bei Bild-PDFs zuerst ocrmypdf einsetzen, um Rauschen zu reduzieren und einen Text-Layer zu erzeugen, bevor weitere Extraktion erfolgt.
- Als System möchte ich Claude Vision API als Fallback nutzen, wenn die Metadaten nach den vorherigen Schritten unvollständig sind.
- Als Buchhalter möchte ich unvollständig erkannte Metadaten manuell korrigieren und bestätigen, um sicherzustellen, dass alle Daten korrekt erfasst sind.

## Acceptance Criteria
- [ ] **Stufe 1 — PDF-Typ-Erkennung:**
  - ZUGFeRD: Prüfung auf eingebettete XML-Datei (ZUGFeRD 1.x / 2.x / XRechnung)
  - Native PDF: Text-Layer vorhanden (pdftotext liefert sinnvollen Text)
  - Bild-PDF: Kein oder minimaler Text-Layer (< 50 Zeichen extrahierbar)
- [ ] **Stufe 2 — ZUGFeRD-Extraktion:**
  - XML parsen nach: Rechnungsnummer, Datum, Fälligkeitsdatum, Betrag (netto/brutto/MwSt), Lieferant (Name, Adresse, IBAN), Empfänger-Adresse
  - Konfidenz: 100% (strukturierte Daten)
- [ ] **Stufe 3 — Native PDF Extraktion:**
  - Text-Layer per `pdf-parse` oder `pdfjs-dist` extrahieren
  - Regex + Heuristiken für: Rechnungsnummer, Datum, Betrag, IBAN, Lieferantenname
  - Konfidenz-Score pro Feld (0–100%)
- [ ] **Stufe 4 — Bild-PDF: ocrmypdf:**
  - ocrmypdf mit Sprache Deutsch (deu), Deskew, Deskew, Rauschreduzierung
  - Ergebnis: PDF mit Text-Layer → weiter wie Stufe 3
- [ ] **Stufe 5 — Claude Vision Fallback:**
  - Wird ausgelöst, wenn Pflichtfelder (Betrag, Datum, Lieferant) nach Stufe 3/4 nicht erkannt
  - Claude Vision analysiert PDF-Seite als Bild
  - Strukturierter JSON-Output (Betrag, Datum, Rechnungsnummer, Lieferant, Adresse)
- [ ] **Objekt-Zuordnung:**
  - Erkannte Empfänger-Adresse wird gegen Verwaltungsobjekte abgeglichen
  - Fuzzy-Matching (Straße, PLZ, Ort)
  - Konfidenz-Score: exakt (100%), Fuzzy-Match (50–99%), kein Match (0%)
- [ ] **Ausgabe:** Strukturiertes Metadaten-Objekt pro Rechnung mit Konfidenz-Scores
- [ ] **Manuelle Korrektur:** Buchhalter kann alle erkannten Felder im Dashboard korrigieren
- [ ] **Verarbeitungs-Status:** `erkannt` (alle Pflichtfelder), `teilweise_erkannt` (manuell prüfen), `fehler`
- [ ] Verarbeitungszeit-Logging pro Stufe

## Extrahierte Metadaten (Pflichtfelder)
- Rechnungsnummer
- Rechnungsdatum
- Fälligkeitsdatum
- Nettobetrag, MwSt-Satz, MwSt-Betrag, Bruttobetrag
- Lieferant: Name, Adresse, IBAN (wenn vorhanden)
- Empfänger-Adresse (für Objekt-Zuordnung)
- Verwaltungsobjekt-ID (nach Zuordnung)
- PDF-Typ: `zugferd`, `native`, `bild`
- Extraktionsmethode: Welche Stufe(n) wurden verwendet
- Konfidenz-Score gesamt (0–100%)

## Edge Cases
- Was passiert, wenn eine ZUGFeRD-XML fehlerhaft/unvollständig ist? → Fallback auf Native PDF Extraktion
- Was passiert, wenn ocrmypdf fehlschlägt (z.B. zu schlechte Scan-Qualität)? → Claude Vision direkt einsetzen, Fehler loggen
- Was passiert bei einer Rechnung mit mehreren Rechnungsnummern/Beträgen (z.B. Sammelrechnung)? → Erster erkannter Wert + Markierung "manuelle Prüfung"
- Was passiert, wenn kein Verwaltungsobjekt zugeordnet werden kann? → Status `teilweise_erkannt`, Buchhalter weist manuell zu
- Was passiert bei sehr langen PDFs (> 20 Seiten)? → Nur erste 3 Seiten für OCR/Vision verarbeiten
- Was passiert, wenn Claude Vision API nicht erreichbar ist? → Rechnung in `fehler`-Status, Retry nach 1 Stunde

## Technical Requirements
- ZUGFeRD-Parsing: `zugferd-node` oder eigene XML-Extraktion (XPath auf eingebettete XML)
- Native PDF: `pdf-parse` oder `pdfjs-dist`
- OCR: `ocrmypdf` (Python CLI, via Supabase Edge Function oder separater Microservice)
- Claude Vision: Anthropic API (`claude-opus-4-6` für höchste Erkennungsrate)
- Verarbeitung: Supabase Edge Functions (asynchron, Queue-basiert)
- Sprache OCR: Deutsch (deu) + optional Englisch (eng)

---
## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
