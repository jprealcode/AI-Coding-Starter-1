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

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/properties/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_ROW = {
  object_number: 'HV-001',
  name: 'Testhaus München',
  street: 'Musterstr. 1',
  postal_code: '80331',
  city: 'München',
}

const VALID_ROW_WITH_BANK = {
  ...VALID_ROW,
  iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX',
  account_holder: 'Max Mustermann GmbH',
  bank_name: 'Commerzbank AG',
}

function mockNoExisting() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'prop-uuid', ...VALID_ROW, notes: null, is_active: true },
          error: null,
        }),
      }
    }
    if (table === 'bank_accounts') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        count: 0,
      }
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/admin/properties/import', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_RESULT)
    const res = await POST(makeRequest({ rows: [VALID_ROW], duplicate_mode: 'skip' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty rows array', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(makeRequest({ rows: [], duplicate_mode: 'skip' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for row missing object_number', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const res = await POST(
      makeRequest({ rows: [{ name: 'Kein Objekt' }], duplicate_mode: 'skip' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const req = new NextRequest(
      'http://localhost/api/admin/properties/import',
      { method: 'POST', body: 'not-json' },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('skips rows with invalid IBAN silently', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    mockNoExisting()

    const rowWithBadIBAN = {
      ...VALID_ROW,
      object_number: 'HV-BAD',
      iban: 'DE00000000000000000000', // invalid checksum
      bic: 'TESTBIC',
      account_holder: 'Test',
      bank_name: 'Testbank',
    }

    const res = await POST(
      makeRequest({ rows: [rowWithBadIBAN], duplicate_mode: 'skip' }),
    )
    // Row with invalid IBAN is skipped entirely
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(0)
  })

  it('defaults duplicate_mode to skip when not provided', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    // Rows is required, duplicate_mode has default
    const res = await POST(makeRequest({ rows: [VALID_ROW] }))
    // Should not return 400 for missing duplicate_mode (it has a default)
    expect(res.status).not.toBe(400)
  })

  it('imports valid property without bank data', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const insertedProp = { id: 'prop-uuid', ...VALID_ROW, notes: null, is_active: true }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: insertedProp, error: null }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest({ rows: [VALID_ROW], duplicate_mode: 'skip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(1)
    expect(body.properties[0].object_number).toBe('HV-001')
  })

  it('skips existing property when duplicate_mode is skip', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          // Existing record found
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-uuid' } }),
        }
      }
      return {}
    })

    const res = await POST(makeRequest({ rows: [VALID_ROW], duplicate_mode: 'skip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(0)
  })

  it('overwrites existing property when duplicate_mode is overwrite', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const updatedProp = { id: 'existing-uuid', ...VALID_ROW, notes: null, is_active: true }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-uuid' } }),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedProp, error: null }),
        }
      }
      return {}
    })

    const res = await POST(
      makeRequest({ rows: [VALID_ROW], duplicate_mode: 'overwrite' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(1)
  })

  it('imports property WITH valid bank account', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)
    const insertedProp = {
      id: 'prop-uuid',
      ...VALID_ROW,
      notes: null,
      is_active: true,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: insertedProp, error: null }),
        }
      }
      if (table === 'bank_accounts') {
        return {
          select: vi.fn().mockReturnValue({
            count: 'exact',
            head: true,
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          eq: vi.fn().mockReturnThis(),
        }
      }
      return {}
    })

    const res = await POST(
      makeRequest({ rows: [VALID_ROW_WITH_BANK], duplicate_mode: 'skip' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(1)
  })

  it('normalizes IBAN (removes spaces, uppercase) before storing', async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_RESULT)

    let capturedInsert: Record<string, unknown> | null = null
    const insertedProp = { id: 'prop-uuid', ...VALID_ROW, notes: null, is_active: true }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: insertedProp, error: null }),
        }
      }
      if (table === 'bank_accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
          insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            capturedInsert = data
            return Promise.resolve({ error: null })
          }),
          eq: vi.fn().mockReturnThis(),
        }
      }
      return {}
    })

    const rowWithSpacedIBAN = {
      ...VALID_ROW,
      iban: 'DE89 3704 0044 0532 0130 00', // with spaces
      bic: 'COBADEFFXXX',
      account_holder: 'Test GmbH',
      bank_name: 'Commerzbank',
    }

    await POST(makeRequest({ rows: [rowWithSpacedIBAN], duplicate_mode: 'skip' }))
    // IBAN should be stored without spaces, uppercased
    expect(capturedInsert?.iban).toBe('DE89370400440532013000')
  })
})
