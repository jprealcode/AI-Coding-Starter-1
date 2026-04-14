import { FileText, Mail, FolderOpen, Upload as UploadIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type InvoiceSource = 'upload' | 'gmail' | 'drive'
export type InvoiceStatus = 'neu' | 'in_bearbeitung' | 'freigegeben' | 'bezahlt' | 'fehler'

export interface Invoice {
  id: string
  source: InvoiceSource
  status: InvoiceStatus
  original_filename: string
  file_size: number
  created_at: string
}

const SOURCE_CONFIG: Record<
  InvoiceSource,
  { label: string; icon: React.ElementType; className: string }
> = {
  upload: {
    label: 'Upload',
    icon: UploadIcon,
    className: 'border-slate-200 text-slate-600 bg-slate-50',
  },
  gmail: {
    label: 'Gmail',
    icon: Mail,
    className: 'border-blue-200 text-blue-700 bg-blue-50',
  },
  drive: {
    label: 'Drive',
    icon: FolderOpen,
    className: 'border-green-200 text-green-700 bg-green-50',
  },
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  neu: { label: 'Neu', className: 'border-amber-200 text-amber-700 bg-amber-50' },
  in_bearbeitung: {
    label: 'In Bearbeitung',
    className: 'border-blue-200 text-blue-700 bg-blue-50',
  },
  freigegeben: {
    label: 'Freigegeben',
    className: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  },
  bezahlt: { label: 'Bezahlt', className: 'border-slate-200 text-slate-600 bg-slate-50' },
  fehler: { label: 'Fehler', className: 'border-red-200 text-red-600 bg-red-50' },
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InvoiceInboxTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Noch keine Rechnungen eingegangen</p>
        <p className="text-slate-400 text-sm mt-1">
          Laden Sie eine PDF hoch oder verbinden Sie Gmail und Google Drive in den Einstellungen.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50">
          <TableHead className="pl-6">Dateiname</TableHead>
          <TableHead>Quelle</TableHead>
          <TableHead>Größe</TableHead>
          <TableHead>Eingangsdatum</TableHead>
          <TableHead className="pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const source = SOURCE_CONFIG[invoice.source]
          const status = STATUS_CONFIG[invoice.status]
          const SourceIcon = source.icon

          return (
            <TableRow key={invoice.id}>
              <TableCell className="pl-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
                    {invoice.original_filename}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1.5 w-fit ${source.className}`}
                >
                  <SourceIcon className="h-3 w-3" />
                  {source.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatSize(invoice.file_size)}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {formatDate(invoice.created_at)}
              </TableCell>
              <TableCell className="pr-6">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
