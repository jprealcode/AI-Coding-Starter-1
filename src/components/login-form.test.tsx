import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { LoginForm } from './login-form'

// Mock Supabase client
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
    from: mockFrom,
  })),
}))

Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

function fillAndSubmit(email: string, password: string) {
  const form = document.querySelector('form')!
  const emailInput = screen.getByLabelText(/e-mail-adresse/i)
  const passwordInput = screen.getByLabelText(/passwort/i)
  fireEvent.change(emailInput, { target: { value: email } })
  fireEvent.change(passwordInput, { target: { value: password } })
  fireEvent.submit(form)
}

function makeProfileChain(isActive: boolean | null) {
  const single = isActive === null
    ? vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    : vi.fn().mockResolvedValue({ data: { is_active: isActive }, error: null })

  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single,
  }
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
  })

  it('renders email and password fields and submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/e-mail-adresse/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anmelden/i })).toBeInTheDocument()
  })

  it('shows validation error for invalid email on submit', async () => {
    render(<LoginForm />)
    fillAndSubmit('kein-email', 'irgendwas')
    await waitFor(() => {
      expect(screen.getByText(/gültige E-Mail-Adresse/)).toBeInTheDocument()
    })
  })

  it('shows validation error when password is empty on submit', async () => {
    render(<LoginForm />)
    fillAndSubmit('test@test.de', '')
    await waitFor(() => {
      expect(screen.getByText(/Passwort ist erforderlich/)).toBeInTheDocument()
    })
  })

  it('shows generic error for wrong credentials — does not reveal which field', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginForm />)
    fillAndSubmit('falsch@test.de', 'falschpass')

    await waitFor(() => {
      expect(screen.getByText(/Anmeldedaten ungültig/)).toBeInTheDocument()
    })
    // Confirm error does not hint at which field is wrong
    const errorText = screen.getByText(/Anmeldedaten ungültig/).textContent ?? ''
    expect(errorText).not.toMatch(/E-Mail.*falsch|Passwort.*falsch/i)
  })

  it('redirects to /dashboard on successful login with active account', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: 'tok' }, user: { id: 'user-1' } },
      error: null,
    })
    const chain = makeProfileChain(true)
    chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) })
    mockFrom.mockReturnValue(chain)

    render(<LoginForm />)
    fillAndSubmit('admin@test.de', 'sicher1234')

    await waitFor(() => {
      expect(window.location.href).toBe('/dashboard')
    })
  })

  it('blocks login and signs out for deactivated account', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: 'tok' }, user: { id: 'user-2' } },
      error: null,
    })
    mockSignOut.mockResolvedValue({})
    mockFrom.mockReturnValue(makeProfileChain(false))

    render(<LoginForm />)
    fillAndSubmit('gesperrt@test.de', 'sicher1234')

    await waitFor(() => {
      expect(screen.getByText(/Konto ist gesperrt/)).toBeInTheDocument()
      expect(mockSignOut).toHaveBeenCalled()
    })
    expect(window.location.href).not.toBe('/dashboard')
  })

  it('disables submit button while login is in progress', async () => {
    // Never resolves — simulates long network call
    mockSignIn.mockReturnValue(new Promise(() => {}))
    mockFrom.mockReturnValue(makeProfileChain(true))

    render(<LoginForm />)
    const button = screen.getByRole('button', { name: /anmelden/i })

    fillAndSubmit('admin@test.de', 'sicher1234')

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })
})
