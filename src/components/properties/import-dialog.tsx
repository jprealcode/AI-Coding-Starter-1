'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Upload, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react'
import { isValidIBAN } from 'ibantools'
import type { ImportRow, Property } from '@/lib/types'

// Erwartete Spaltenköpfe (Groß/Kleinschreibung egal)
const COLUMN_MAP: Record<string, keyof ImportRow> = {
  objektnummer: 'object_number',
  'objekt-nr': 'object_number',
  'objekt nr': 'object_number',
  bezeichnung: 'name',
  name: 'name',
  straße: 'street',
  strasse: 'street',
  plz: 'postal_code',
  ort: 'city',
  iban: 'iban',
  bic: 'bic',
  swift: 'bic',
  kontoinhaber: 'account_holder',
  inhaber: 'account_holder',
  bank: 'bank_name',
  bankname: 'bank_name',
  'bank-name': 'bank_name',
  // PROJ-13: Eigentümer
  'eigentümer-name': 'owner_name',
  'eigentümer name': 'owner_name',
  eigentümername: 'owner_name',
  'eigentümer-typ': 'owner_type',
  eigentümertyp: 'owner_type',
  'eigentümer-straße': 'owner_street',
  'eigentümer straße': 'owner_street',
  'eigentümer-plz': 'owner_postal_code',
  'eigentümer plz': 'owner_postal_code',
  'eigentümer-ort': 'owner_city',
  'eigentümer ort': 'owner_city',
  'eigentümer-email': 'owner_email',
  'eigentümer email': 'owner_email',
  'eigentümer-ust-id': 'owner_tax_id',
  'eigentümer ust-id': 'owner_tax_id',
  'eigentümer-steuernummer': 'owner_tax_id',
  hauptverantwortlicher: 'hauptverantwortlicher_email',
  'hauptverantwortlicher (e-mail)': 'hauptverantwortlicher_email',
}

function parseSheet(
  rows: Record<string, string>[],
  existingNumbers: string[],
): ImportRow[] {
  return rows.map((raw) => {
    const row: ImportRow = {
      object_number: '',
      name: '',
      _errors: [],
      _isValid: false,
      _isDuplicate: false,
      _warnings: [],
    }

    // Spalten mappen
    for (const [rawKey, value] of Object.entries(raw)) {
      const key = COLUMN_MAP[rawKey.toLowerCase().trim()]
      if (key && value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(row as any)[key] = String(value).trim()
      }
    }

    // Validierung
    if (!row.object_number) row._errors.push('Objektnummer fehlt')
    if (!row.name) row._errors.push('Bezeichnung fehlt')

    if (row.iban) {
      const normalized = row.iban.replace(/\s/g, '').toUpperCase()
      row.iban = normalized
      if (!isValidIBAN(normalized)) row._errors.push('Ungültige IBAN')
    }

    row._isDuplicate = existingNumbers.includes(row.object_number)
    row._isValid = row._errors.length === 0

    return row
  })
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNumbers: string[]
  onImported: (properties: Property[]) => void
}

type Step = 'upload' | 'preview' | 'importing'
type DuplicateMode = 'skip' | 'overwrite'

export function ImportDialog({
  open,
  onOpenChange,
  existingNumbers,
  onImported,
}: ImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => r._isValid)
  const invalidRows = rows.filter((r) => !r._isValid)
  const duplicates = rows.filter((r) => r._isValid && r._isDuplicate)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)

    try {
      const { read, utils } = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) {
        setParseError('Die Excel-Datei enthält keine Tabellen.')
        return
      }
      const raw = utils.sheet_to_json<Record<string, string>>(ws, {
        defval: '',
        raw: false,
      })

      if (raw.length === 0) {
        setParseError('Die Tabelle ist leer.')
        return
      }

      // Prüfe ob Pflicht-Spalten vorhanden
      const firstRow = raw[0]
      const headers = Object.keys(firstRow).map((h) => h.toLowerCase().trim())
      const hasObjNr = headers.some((h) => COLUMN_MAP[h] === 'object_number')
      const hasName = headers.some((h) => COLUMN_MAP[h] === 'name')

      if (!hasObjNr || !hasName) {
        setParseError(
          `Pflicht-Spalten fehlen. Benötigt: "Objektnummer" und "Bezeichnung". ` +
            `Gefunden: ${Object.keys(firstRow).join(', ')}`,
        )
        return
      }

      const parsed = parseSheet(raw, existingNumbers)
      setRows(parsed)
      setStep('preview')
    } catch {
      setParseError('Fehler beim Lesen der Excel-Datei. Bitte prüfen Sie das Format.')
    }

    // Input zurücksetzen damit dieselbe Datei nochmal gewählt werden kann
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleImport() {
    setImportError(null)
    setStep('importing')

    const toImport = validRows.filter(
      (r) => !r._isDuplicate || duplicateMode === 'overwrite',
    )

    const res = await fetch('/api/admin/properties/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: toImport,
        duplicate_mode: duplicateMode,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setImportError(body.error ?? 'Import fehlgeschlagen')
      setStep('preview')
      return
    }

    const { properties } = await res.json()
    handleClose()
    onImported(properties)
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setStep('upload')
      setRows([])
      setParseError(null)
      setImportError(null)
      setDuplicateMode('skip')
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Excel importieren'}
            {step === 'preview' && `Vorschau — ${rows.length} Zeilen gefunden`}
            {step === 'importing' && 'Importiere...'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Schritt 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600">
                Laden Sie eine Excel-Datei (.xlsx) hoch. Benötigte Spalten:{' '}
                <strong>Objektnummer</strong>, <strong>Bezeichnung</strong>. Optional:{' '}
                Straße, PLZ, Ort, IBAN, BIC, Kontoinhaber, Bank.
              </p>

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <label
                htmlFor="excel-upload"
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              >
                <FileSpreadsheet className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">
                  Klicken oder Datei hierher ziehen
                </span>
                <span className="text-xs text-slate-400 mt-1">.xlsx, .xls</span>
                <input
                  id="excel-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {/* ── Schritt 2: Vorschau ── */}
          {step === 'preview' && (
            <div className="space-y-4 py-2">
              {/* Zusammenfassung */}
              <div className="flex gap-3 flex-wrap">
                <Badge
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 bg-emerald-50"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validRows.length} gültig
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-red-200 text-red-600 bg-red-50"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    {invalidRows.length} fehlerhaft
                  </Badge>
                )}
                {duplicates.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-amber-700 bg-amber-50"
                  >
                    {duplicates.length} bereits vorhanden
                  </Badge>
                )}
              </div>

              {/* Duplikat-Option */}
              {duplicates.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex items-center gap-3 flex-1">
                    <Label className="text-sm text-amber-800 shrink-0">
                      Doppelte Objektnummern:
                    </Label>
                    <Select
                      value={duplicateMode}
                      onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}
                    >
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Überspringen</SelectItem>
                        <SelectItem value="overwrite">Überschreiben</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              {/* Vorschau-Tabelle */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs w-8">#</TableHead>
                      <TableHead className="text-xs">Objektnummer</TableHead>
                      <TableHead className="text-xs">Bezeichnung</TableHead>
                      <TableHead className="text-xs">Ort</TableHead>
                      <TableHead className="text-xs">IBAN</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow
                        key={i}
                        className={
                          !row._isValid
                            ? 'bg-red-50/50'
                            : row._isDuplicate
                              ? 'bg-amber-50/50'
                              : ''
                        }
                      >
                        <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.object_number || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{row.name || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {[row.postal_code, row.city].filter(Boolean).join(' ') || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {row.iban || '—'}
                        </TableCell>
                        <TableCell>
                          {!row._isValid ? (
                            <span
                              className="text-xs text-red-600"
                              title={row._errors.join(', ')}
                            >
                              <XCircle className="h-3.5 w-3.5 inline mr-1" />
                              {row._errors[0]}
                            </span>
                          ) : row._isDuplicate ? (
                            <span className="text-xs text-amber-600">
                              Doppelt
                            </span>
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ── Schritt 3: Importieren ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">Daten werden importiert...</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Zurück
              </Button>
              <Button
                disabled={validRows.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleImport}
              >
                <Upload className="h-4 w-4 mr-2" />
                {validRows.filter((r) => !r._isDuplicate || duplicateMode === 'overwrite').length} Objekte importieren
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
