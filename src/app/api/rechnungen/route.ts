import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { serviceClient } from '@/lib/require-admin'

const PAGE_SIZE = 50

// GET /api/rechnungen?page=1&status=neu&source=gmail
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1'))
  const status = params.get('status')
  const source = params.get('source')
  const offset = (page - 1) * PAGE_SIZE

  const db = serviceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    .limit(PAGE_SIZE)

  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)

  const { data: invoices, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    invoices: invoices ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  })
}
