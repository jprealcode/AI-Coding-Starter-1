import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock Supabase SSR client
const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockAdminCreateUser = vi.fn()
const mockAdminDeleteUser = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        deleteUser: mockAdminDeleteUser,
      },
    },
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

const ADMIN_USER = { id: 'admin-uuid', email: 'admin@test.de' }
const ADMIN_PROFILE = { role: 'admin' }

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  })

  it('creates user successfully when caller is admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: ADMIN_PROFILE }),
    })
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    const req = makeRequest({
      email: 'new@test.de',
      display_name: 'Neuer Benutzer',
      role: 'approver',
      password: 'sicher1234',
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = makeRequest({
      email: 'new@test.de',
      display_name: 'Test',
      role: 'approver',
      password: 'sicher1234',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 403 when caller is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'approver' } }),
    })

    const req = makeRequest({
      email: 'new@test.de',
      display_name: 'Test',
      role: 'approver',
      password: 'sicher1234',
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid input (missing email)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: ADMIN_PROFILE }),
    })

    const req = makeRequest({
      display_name: 'Test',
      role: 'approver',
      password: 'sicher1234',
      // email missing
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for password too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: ADMIN_PROFILE }),
    })

    const req = makeRequest({
      email: 'test@test.de',
      display_name: 'Test',
      role: 'approver',
      password: '123', // zu kurz
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rolls back user on profile insert failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: ADMIN_PROFILE }),
    })
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })

    const req = makeRequest({
      email: 'fail@test.de',
      display_name: 'Fehlschlag',
      role: 'approver',
      password: 'sicher1234',
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    // Rollback: deleteUser should be called
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('new-user-uuid')
  })
})
