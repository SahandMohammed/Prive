export type ContactKind = 0 | 1
export type ContactRole = 0 | 1 | 2

export interface Contact {
  id: string
  name: string
  kind: ContactKind
  isCustomer: boolean
  isSupplier: boolean
  primaryPhoneNumber: string | null
  secondaryPhoneNumber: string | null
  email: string | null
  address: string | null
  city: string | null
  region: string | null
  country: string | null
  notes: string | null
  isActive: boolean
}

export interface ContactInput {
  name: string
  kind: ContactKind
  isCustomer: boolean
  isSupplier: boolean
  primaryPhoneNumber: string | null
  secondaryPhoneNumber: string | null
  email: string | null
  address: string | null
  city: string | null
  region: string | null
  country: string | null
  notes: string | null
  isActive: boolean
}

export interface ContactListParams {
  page: number
  pageSize: number
  search?: string
  role?: ContactRole
  isActive?: boolean
  kind?: ContactKind
}
