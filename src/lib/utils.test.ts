import { describe, it, expect } from 'vitest'
import { sanitizeStorageFilename } from './utils'

describe('sanitizeStorageFilename', () => {
  it('keeps normal PDF filename unchanged', () => {
    expect(sanitizeStorageFilename('rechnung.pdf')).toBe('rechnung.pdf')
  })

  it('replaces spaces with hyphens', () => {
    expect(sanitizeStorageFilename('Rechnung März 2026.pdf')).toBe('Rechnung-Mrz-2026.pdf')
  })

  it('strips path traversal segments', () => {
    expect(sanitizeStorageFilename('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(sanitizeStorageFilename('..\\..\\windows\\system32.pdf')).toBe('system32.pdf')
  })

  it('strips leading dots', () => {
    expect(sanitizeStorageFilename('.hidden.pdf')).toBe('hidden.pdf')
  })

  it('collapses multiple consecutive dots', () => {
    expect(sanitizeStorageFilename('file...name.pdf')).toBe('file.name.pdf')
  })

  it('returns fallback for empty or all-special-char names', () => {
    expect(sanitizeStorageFilename('')).toBe('upload.pdf')
    expect(sanitizeStorageFilename('!!!')).toBe('upload.pdf')
  })

  it('truncates very long filenames to 200 chars', () => {
    const long = 'a'.repeat(300) + '.pdf'
    expect(sanitizeStorageFilename(long).length).toBeLessThanOrEqual(200)
  })

  it('uses last path component only', () => {
    expect(sanitizeStorageFilename('folder/subfolder/rechnung.pdf')).toBe('rechnung.pdf')
  })
})
