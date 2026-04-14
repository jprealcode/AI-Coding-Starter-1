import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockGetUser, mockServiceClientFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServiceClientFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/require-admin', () => ({
  serviceClient: vi.fn(() => ({
    from: mockServiceClientFrom,
    storage: { from: mockStorageFrom },
  })),
}))

const AUTH_OK = { data: { user: { id: 'user-uuid' } } }
const AUTH_NONE = { data: { user: null } }

/** Creates a NextRequest where formData() is mocked to avoid multipart-parsing issues in test env */
function makeUploadRequest(formData: FormData) {
  const req = new NextRequest('http://localhost/api/rechnungen/upload', { method: 'POST' })
  vi.spyOn(req, 'formData').mockResolvedValue(formData)
  return req
}

function pdfFormData(name = 'rechnung.pdf', size = 1024): FormData {
  const fd = new FormData()
  const content = new Uint8Array(size).fill(37)
  fd.append('file', new File([content], name, { type: 'application/pdf' }))
  return fd
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/rechnungen/upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue(AUTH_NONE)
    const res = await POST(makeUploadRequest(pdfFormData()))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file provided', async () => {
    mockGetUser.mockResolvedValue(AUTH_OK)
    const res = await POST(makeUploadRequest(new FormData()))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Keine Datei')
  })

  it('returns 400 for non-PDF file', async () => {
    mockGetUser.mockResolvedValue(AUTH_OK)
    const fd = new FormData()
    fd.append('file', new File(['hello'], 'test.txt', { type: 'text/plain' }))
    const res = await POST(makeUploadRequest(fd))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('PDF')
  })

  it('returns 409 for duplicate file (same hash)', async () => {
    mockGetUser.mockResolvedValue(AUTH_OK)
    mockServiceClientFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'existing-id', original_filename: 'original.pdf' },
        error: null,
      }),
    })

    const res = await POST(makeUploadRequest(pdfFormData()))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(body.error).toContain('Duplikat')
  })

  it('uploads PDF and creates invoice record successfully', async () => {
    mockGetUser.mockResolvedValue(AUTH_OK)

    // No duplicate found
    mockServiceClientFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    // Storage upload succeeds
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn(),
    })

    // DB insert succeeds
    const fakeInvoice = {
      id: 'new-uuid',
      source: 'upload',
      status: 'neu',
      original_filename: 'rechnung.pdf',
      file_size: 1024,
      storage_path: '2026/04/new-uuid/rechnung.pdf',
      sha256_hash: 'abc123',
      created_at: new Date().toISOString(),
    }
    mockServiceClientFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: fakeInvoice, error: null }),
    })

    const res = await POST(makeUploadRequest(pdfFormData()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.invoice.source).toBe('upload')
    expect(body.invoice.status).toBe('neu')
  })

  it('returns 500 and cleans up storage if DB insert fails', async () => {
    mockGetUser.mockResolvedValue(AUTH_OK)

    mockServiceClientFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    const mockRemove = vi.fn().mockResolvedValue({})
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: mockRemove,
    })

    mockServiceClientFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB-Fehler' } }),
    })

    const res = await POST(makeUploadRequest(pdfFormData()))
    expect(res.status).toBe(500)
    expect(mockRemove).toHaveBeenCalledOnce()
  })
})
