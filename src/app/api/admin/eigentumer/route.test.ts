import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

const { mockRequireAdmin, mockServiceClientFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockServiceClientFrom: vi.fn(),
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: mockRequireAdmin,
  serviceClient: vi.fn(() => ({ from: mockServiceClientFrom })),
}))

const ADMIN_RESULT  = { user: { id: 'admin-uuid' } }
const UNAUTH_RESULT = {
  errorResponse: new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  }),
}
const FORBIDDEN_RESULT = {
  errorResponse: new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  }),
}

const OWNER = {
  id: 'owner-uuid',
  name: 'Müller GmbH',
  type: 'GmbH',
  street: 'Musterstraße 1',
  postal_code: '20095',
  city: 'Hamburg',
  email: 'info@mueller.de',
  phone: null,
  tax_id: 'DE123456789',
  created_at: '2026-04-18T00:00:00Z',
  updated_at: '2026-04-18T00:00:00Z',
  properties: [{ count: 3 }],
}

function makeGetRequest(q?: string) {
  const url = q
    ? `http://localhost/api/admin/eigentumer?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/admin/eigentumer'
  return new NextRequest(url, { method: 'GET' })
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/eigentumer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── GET tests ─────────────────────────────────────────────────────────────

describe('GET /api/admin/eigentumer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(FORBIDDEN_RESULT)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(403)
  })

  it('returns list of owners with property_count', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [OWNER], error: null }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owners).toHaveLength(1)
    expect(body.owners[0].property_count).toBe(3)
    expect(body.owners[0].properties).toBeUndefined()
  })

  it('returns empty list when no owners exist', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owners).toHaveLength(0)
  })

  it('returns 400 when Supabase query fails', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation "owners" does not exist' },
      }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(400)
  })
})

// ─── POST tests ────────────────────────────────────────────────────────────

describe('POST /api/admin/eigentumer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await POST(makePostRequest({ name: 'Test GmbH', type: 'GmbH' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(FORBIDDEN_RESULT)
    const res = await POST(makePostRequest({ name: 'Test GmbH', type: 'GmbH' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing name', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makePostRequest({ type: 'GmbH' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing type', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makePostRequest({ name: 'Müller GmbH' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makePostRequest({ name: 'Müller GmbH', type: 'InvalidType' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for name too short', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makePostRequest({ name: 'X', type: 'GmbH' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makePostRequest({ name: 'Müller GmbH', type: 'GmbH', email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('creates owner successfully', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const created = { ...OWNER, properties: undefined }
    mockServiceClientFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    })

    const res = await POST(makePostRequest({
      name: 'Müller GmbH',
      type: 'GmbH',
      city: 'Hamburg',
      email: 'info@mueller.de',
      tax_id: 'DE123456789',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.owner.name).toBe('Müller GmbH')
    expect(body.owner.property_count).toBe(0)
  })

  it('creates owner with WEG type', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const wegOwner = { ...OWNER, name: 'WEG Musterstraße', type: 'WEG', properties: undefined }
    mockServiceClientFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: wegOwner, error: null }),
    })

    const res = await POST(makePostRequest({ name: 'WEG Musterstraße', type: 'WEG' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.owner.type).toBe('WEG')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const req = new NextRequest('http://localhost/api/admin/eigentumer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
