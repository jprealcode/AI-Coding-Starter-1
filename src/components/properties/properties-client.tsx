'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Upload, Download, Search, Banknote } from 'lucide-react'
import type { Property } from '@/lib/types'
import { NewPropertyDialog } from './new-property-dialog'
import { PropertyDetailSheet } from './property-detail-sheet'
import { ImportDialog } from './import-dialog'

interface PropertiesClientProps {
  initialProperties: Property[]
}

export function PropertiesClient({ initialProperties }: PropertiesClientProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties)
  const [search, setSearch] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return properties
    const q = search.toLowerCase()
    return properties.filter(
      (p) =>
        p.object_number.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.street?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q),
    )
  }, [properties, search])

  function handleRowClick(property: Property) {
    setSelectedProperty(property)
    setIsDetailOpen(true)
  }

  function handlePropertyCreated(property: Property) {
    setProperties((prev) =>
      [...prev, { ...property, bank_account_count: 0 }].sort((a, b) =>
        a.object_number.localeCompare(b.object_number),
      ),
    )
    setIsNewDialogOpen(false)
  }

  function handlePropertyUpdated(updated: Property) {
    setProperties((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    )
    setSelectedProperty((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev,
    )
  }

  function handleImportComplete(imported: Property[]) {
    setProperties((prev) => {
      const map = new Map(prev.map((p) => [p.object_number, p]))
      imported.forEach((p) =>
        map.set(p.object_number, {
          ...p,
          bank_account_count: p.bank_accounts?.length ?? 0,
        }),
      )
      return Array.from(map.values()).sort((a, b) =>
        a.object_number.localeCompare(b.object_number),
      )
    })
    setIsImportDialogOpen(false)
  }

  async function handleExport() {
    const { utils, writeFile } = await import('xlsx')
    const rows = properties.map((p) => ({
      Objektnummer: p.object_number,
      Bezeichnung: p.name,
      Straße: p.street,
      PLZ: p.postal_code,
      Ort: p.city,
      Notiz: p.notes ?? '',
      Status: p.is_active ? 'Aktiv' : 'Inaktiv',
      Bankverbindungen: p.bank_account_count ?? 0,
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Objekte')
    writeFile(wb, 'verwaltungsobjekte.xlsx')
  }

  const activeCount = properties.filter((p) => p.is_active).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Verwaltungsobjekte</h1>
          <p className="text-slate-500 mt-1">
            {properties.length} Objekte · {activeCount} aktiv
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Excel exportieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Excel importieren
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsNewDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neues Objekt
          </Button>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Objektnummer, Bezeichnung, Adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            Alle Verwaltungsobjekte
          </CardTitle>
          <CardDescription>
            Klicken Sie auf ein Objekt, um Details und Bankverbindungen anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="pl-6">Objektnummer</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Ort</TableHead>
                <TableHead>Bankverbindungen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => (
                <TableRow
                  key={property.id}
                  className={`cursor-pointer hover:bg-slate-50 ${!property.is_active ? 'opacity-50' : ''}`}
                  onClick={() => handleRowClick(property)}
                >
                  <TableCell className="pl-6 font-mono text-sm font-medium text-slate-700">
                    {property.object_number}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {property.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {[property.postal_code, property.city].filter(Boolean).join(' ')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {property.bank_account_count ?? 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        property.is_active
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          : 'border-red-200 text-red-600 bg-red-50'
                      }
                    >
                      {property.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-16 text-slate-400"
                  >
                    {search
                      ? 'Keine Objekte gefunden'
                      : 'Noch keine Verwaltungsobjekte angelegt'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewPropertyDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onCreated={handlePropertyCreated}
      />

      <PropertyDetailSheet
        property={selectedProperty}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdated={handlePropertyUpdated}
      />

      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        existingNumbers={properties.map((p) => p.object_number)}
        onImported={handleImportComplete}
      />
    </div>
  )
}
