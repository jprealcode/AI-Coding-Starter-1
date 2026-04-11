export type UserRole = 'admin' | 'approver'

export interface Profile {
  id: string
  user_id: string
  display_name: string
  email: string
  role: UserRole
  is_active: boolean
  last_seen_at: string | null
  created_at: string
}

export interface BankAccount {
  id: string
  property_id: string
  iban: string
  bic: string
  account_holder: string
  bank_name: string
  is_default: boolean
  created_at: string
}

export interface Property {
  id: string
  object_number: string
  name: string
  street: string
  postal_code: string
  city: string
  notes: string | null
  is_active: boolean
  created_at: string
  bank_account_count?: number
  bank_accounts?: BankAccount[]
}

export interface ImportRow {
  object_number: string
  name: string
  street?: string
  postal_code?: string
  city?: string
  iban?: string
  bic?: string
  account_holder?: string
  bank_name?: string
  _errors: string[]
  _isValid: boolean
  _isDuplicate: boolean
}
