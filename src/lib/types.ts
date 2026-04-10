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
