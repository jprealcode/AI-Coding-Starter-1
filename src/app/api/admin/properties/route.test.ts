import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

// ─── Mocks (vi.hoisted ensures vars are available when vi.mock is executed) ──

const { mockRequireAdmin, mockServiceClientFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockServiceClientFrom: vi.fn(),
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: mockRequireAdmin,
  serviceClient: vi.fn(() => ({
    from: mockServiceClientFrom,
  })),
}))

const ADMIN_USER = { id: 'admin-uuid' }
const ADMIN_RESULT = { user: ADMIN_USER }
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

function makeGetRequest(q?: string) {
  const url = q
    ? `http://localhost/api/admin/properties?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/admin/properties'
  return new NextRequest(url, { method: 'GET' })
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── GET tests ────────────────────────────────────────────────────────────

describe('GET /api/admin/properties', () => {
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

  it('returns list of properties with bank_account_count', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      // No search, so or is not called — resolves directly
      then: undefined,
    })

    // For the test to work with the actual query chain, simulate the resolved data
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'prop-1',
            object_number: 'HV-001',
            name: 'Testhaus',
            street: 'Musterstr. 1',
            postal_code: '80331',
            city: 'München',
            notes: null,
            is_active: true,
            bank_accounts: [{ count: 2 }],
          },
        ],
        error: null,
      }),
    }
    mockServiceClientFrom.mockReturnValue(mockQuery)

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.properties).toHaveLength(1)
    expect(body.properties[0].bank_account_count).toBe(2)
    expect(body.properties[0].bank_accounts).toBeUndefined()
  })

  it('returns empty list when no properties exist', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.properties).toHaveLength(0)
  })

  it('returns 400 when Supabase query fails', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation "properties" does not exist' },
      }),
    })

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})

// ─── POST tests ───────────────────────────────────────────────────────────

describe('POST /api/admin/properties', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await POST(
      makePostRequest({ object_number: 'HV-001', name: 'Test' }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(FORBIDDEN_RESULT)
    const res = await POST(
      makePostRequest({ object_number: 'HV-001', name: 'Test' }),
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing required fields', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    // Missing object_number
    const res = await POST(makePostRequest({ name: 'Test ohne Nummer' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for name too short', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(
      makePostRequest({ object_number: 'HV-001', name: 'X' }),
    )
    expect(res.status).toBe(400)
  })

  it('creates property successfully', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const newProperty = {
      id: 'new-prop-uuid',
      object_number: 'HV-042',
      name: 'Neues Haus',
      street: 'Musterstr. 42',
      postal_code: '80331',
      city: 'München',
      notes: null,
      is_active: true,
      created_at: '2026-04-11T00:00:00Z',
    }
    mockServiceClientFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newProperty, error: null }),
    })

    const res = await POST(
      makePostRequest({
        object_number: 'HV-042',
        name: 'Neues Haus',
        street: 'Musterstr. 42',
        postal_code: '80331',
        city: 'München',
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.property.object_number).toBe('HV-042')
    expect(body.property.bank_account_count).toBe(0)
  })

  it('returns 409 when object_number already exists', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockServiceClientFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }),
    })

    const res = await POST(
      makePostRequest({ object_number: 'HV-001', name: 'Duplikat Objekt' }),
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('HV-001')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const req = new NextRequest('http://localhost/api/admin/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
