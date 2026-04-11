import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// ─── Mocks ────────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: mockRequireAdmin,
  serviceClient: vi.fn(() => ({ from: mockFrom })),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────

const ADMIN_RESULT = { user: { id: 'admin-uuid' } }
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

function makeRequest(body: object) {
  return new NextRequest(
    'http://localhost/api/admin/properties/prop-uuid/bank-accounts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

const VALID_PARAMS = { params: Promise.resolve({ id: 'prop-uuid' }) }

const VALID_BANK = {
  iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX',
  account_holder: 'Max Mustermann GmbH',
  bank_name: 'Commerzbank AG',
}

function mockPropertyExists() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prop-uuid' } }),
      }
    }
    if (table === 'bank_accounts') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'bank-uuid', ...VALID_BANK, property_id: 'prop-uuid', is_default: true },
          error: null,
        }),
      }
    }
    return {}
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/admin/properties/[id]/bank-accounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await POST(makeRequest(VALID_BANK), VALID_PARAMS)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(FORBIDDEN_RESULT)
    const res = await POST(makeRequest(VALID_BANK), VALID_PARAMS)
    expect(res.status).toBe(403)
  })

  it('returns 404 when property does not exist', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }))

    const res = await POST(makeRequest(VALID_BANK), VALID_PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid IBAN', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prop-uuid' } }),
        }
      }
      return {}
    })

    const res = await POST(
      makeRequest({ ...VALID_BANK, iban: 'DE00000000000000000000' }), // invalid checksum
      VALID_PARAMS,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/IBAN/i)
  })

  it('returns 400 for missing required fields', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prop-uuid' } }),
        }
      }
      return {}
    })

    // Missing bic
    const res = await POST(
      makeRequest({ iban: 'DE89370400440532013000', account_holder: 'Test', bank_name: 'Bank' }),
      VALID_PARAMS,
    )
    expect(res.status).toBe(400)
  })

  it('accepts IBAN with spaces (normalizes it)', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockPropertyExists()

    const res = await POST(
      makeRequest({ ...VALID_BANK, iban: 'DE89 3704 0044 0532 0130 00' }),
      VALID_PARAMS,
    )
    // Should succeed after normalization
    expect(res.status).toBe(201)
  })

  it('creates bank account successfully and returns 201', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockPropertyExists()

    const res = await POST(makeRequest(VALID_BANK), VALID_PARAMS)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bank_account.iban).toBe('DE89370400440532013000')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const req = new NextRequest(
      'http://localhost/api/admin/properties/prop-uuid/bank-accounts',
      { method: 'POST', body: 'not-json' },
    )
    const res = await POST(req, VALID_PARAMS)
    expect(res.status).toBe(400)
  })
})
