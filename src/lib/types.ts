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

export type OwnerType =
  | 'Privatperson'
  | 'GmbH'
  | 'AG'
  | 'KG'
  | 'UG'
  | 'GbR'
  | 'WEG'
  | 'Sonstige'

export const OWNER_TYPES: OwnerType[] = [
  'Privatperson',
  'GmbH',
  'AG',
  'KG',
  'UG',
  'GbR',
  'WEG',
  'Sonstige',
]

export interface Owner {
  id: string
  name: string
  type: OwnerType
  street: string | null
  postal_code: string | null
  city: string | null
  email: string | null
  phone: string | null
  tax_id: string | null
  created_at: string
  updated_at: string
  property_count?: number
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
  owner_id?: string | null
  owner?: Owner | null
  hauptverantwortlicher_user_id?: string | null
  hauptverantwortlicher?: Profile | null
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
  // PROJ-13: Eigentümer + Hauptverantwortlicher
  owner_name?: string
  owner_type?: string
  owner_street?: string
  owner_postal_code?: string
  owner_city?: string
  owner_email?: string
  owner_tax_id?: string
  hauptverantwortlicher_email?: string
  _errors: string[]
  _isValid: boolean
  _isDuplicate: boolean
  _warnings: string[]
}
