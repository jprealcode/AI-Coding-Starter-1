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
import { UserRound, Plus, Search, Building2 } from 'lucide-react'
import type { Owner } from '@/lib/types'
import { NewEigentümerDialog } from './new-eigentümer-dialog'
import { EigentümerDetailSheet } from './eigentümer-detail-sheet'

interface EigentümerClientProps {
  initialOwners: Owner[]
}

export function EigentümerClient({ initialOwners }: EigentümerClientProps) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners)
  const [search, setSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return owners
    const q = search.toLowerCase()
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q),
    )
  }, [owners, search])

  function handleRowClick(owner: Owner) {
    setSelectedOwner(owner)
    setIsDetailOpen(true)
  }

  function handleOwnerCreated(owner: Owner) {
    setOwners((prev) =>
      [...prev, { ...owner, property_count: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name, 'de'),
      ),
    )
    setIsNewDialogOpen(false)
  }

  function handleOwnerUpdated(updated: Owner) {
    setOwners((prev) =>
      prev
        .map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    )
    setSelectedOwner((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
  }

  function handleOwnerDeleted(ownerId: string) {
    setOwners((prev) => prev.filter((o) => o.id !== ownerId))
    setSelectedOwner(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Eigentümer</h1>
          <p className="text-slate-500 mt-1">
            {owners.length} Eigentümer
          </p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => setIsNewDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Eigentümer
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Name, Typ, Ort..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-500" />
            Alle Eigentümer
          </CardTitle>
          <CardDescription>
            Klicken Sie auf einen Eigentümer, um Details und verknüpfte Objekte anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Ort</TableHead>
                <TableHead>Objekte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((owner) => (
                <TableRow
                  key={owner.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleRowClick(owner)}
                >
                  <TableCell className="pl-6 font-medium text-slate-800">
                    {owner.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {owner.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {[owner.postal_code, owner.city].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {owner.property_count ?? 0}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 text-slate-400">
                    {search ? 'Keine Eigentümer gefunden' : 'Noch keine Eigentümer angelegt'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewEigentümerDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onCreated={handleOwnerCreated}
      />

      <EigentümerDetailSheet
        owner={selectedOwner}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdated={handleOwnerUpdated}
        onDeleted={handleOwnerDeleted}
      />
    </div>
  )
}
