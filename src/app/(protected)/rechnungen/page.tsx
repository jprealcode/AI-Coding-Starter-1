import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { serviceClient } from '@/lib/require-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceInboxTable, type Invoice } from '@/components/rechnungen/invoice-inbox-table'
import { UploadDropzone } from '@/components/rechnungen/upload-dropzone'
import { Inbox } from 'lucide-react'

export default async function RechnungenPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = serviceClient()
  const { data } = await db
    .from('invoices')
    .select('id, source, status, original_filename, file_size, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const invoices = (data ?? []) as Invoice[]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Rechnungseingang</h1>
        <p className="text-slate-500 mt-1">Eingehende Rechnungen aus allen Quellen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload area */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">PDF hochladen</CardTitle>
              <CardDescription>Manuell eingescannte Rechnungen einspeisen</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDropzone />
            </CardContent>
          </Card>
        </div>

        {/* Inbox table */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="h-4 w-4 text-slate-500" />
                Eingangskorb
              </CardTitle>
              <CardDescription>
                {invoices.length === 0
                  ? 'Noch keine Rechnungen eingegangen'
                  : `${invoices.length} Rechnung${invoices.length !== 1 ? 'en' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <InvoiceInboxTable invoices={invoices} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
