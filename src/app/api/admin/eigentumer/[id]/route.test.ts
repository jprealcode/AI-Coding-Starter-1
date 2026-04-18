import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from './route'

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
  street: null,
  postal_code: null,
  city: 'Hamburg',
  email: null,
  phone: null,
  tax_id: null,
  created_at: '2026-04-18T00:00:00Z',
  updated_at: '2026-04-18T00:00:00Z',
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/admin/eigentumer/owner-uuid', { method: 'GET' })
}

function makePatchRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/eigentumer/owner-uuid', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/admin/eigentumer/owner-uuid', { method: 'DELETE' })
}

// ─── GET tests ─────────────────────────────────────────────────────────────

describe('GET /api/admin/eigentumer/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await GET(makeGetRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when owner not found', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    })

    const res = await GET(makeGetRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(404)
  })

  it('returns owner detail with linked properties', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const properties = [{ id: 'prop-1', object_number: 'HV-001', name: 'Haus', city: 'Hamburg', is_active: true }]

    mockServiceClientFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: OWNER, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: properties, error: null }),
      })

    const res = await GET(makeGetRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owner.name).toBe('Müller GmbH')
    expect(body.properties).toHaveLength(1)
  })
})

// ─── PATCH tests ───────────────────────────────────────────────────────────

describe('PATCH /api/admin/eigentumer/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await PATCH(makePatchRequest({ name: 'Neu GmbH' }), makeParams('owner-uuid'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(FORBIDDEN_RESULT)
    const res = await PATCH(makePatchRequest({ name: 'Neu GmbH' }), makeParams('owner-uuid'))
    expect(res.status).toBe(403)
  })

  it('returns 400 for empty body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await PATCH(makePatchRequest({}), makeParams('owner-uuid'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await PATCH(makePatchRequest({ type: 'InvalidType' }), makeParams('owner-uuid'))
    expect(res.status).toBe(400)
  })

  it('updates owner successfully', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const updated = { ...OWNER, name: 'Müller Holding GmbH', city: 'Berlin' }
    mockServiceClientFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    })

    const res = await PATCH(
      makePatchRequest({ name: 'Müller Holding GmbH', city: 'Berlin' }),
      makeParams('owner-uuid'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owner.name).toBe('Müller Holding GmbH')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const req = new NextRequest('http://localhost/api/admin/eigentumer/owner-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad-json',
    })
    const res = await PATCH(req, makeParams('owner-uuid'))
    expect(res.status).toBe(400)
  })
})

// ─── DELETE tests ──────────────────────────────────────────────────────────

describe('DELETE /api/admin/eigentumer/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await DELETE(makeDeleteRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when count query fails', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } }),
    })

    const res = await DELETE(makeDeleteRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(400)
  })

  it('returns 409 when owner has linked properties', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    })

    const res = await DELETE(makeDeleteRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('3 Objekte')
  })

  it('deletes owner successfully when no properties linked', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      })
      .mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

    const res = await DELETE(makeDeleteRequest(), makeParams('owner-uuid'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
