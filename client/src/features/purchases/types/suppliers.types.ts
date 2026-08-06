export interface Supplier {
  id: string
  name: string
  phoneNumber: string | null
  email: string | null
  address: string | null
  description: string | null
  openingBalance: number
  accountId: string
  isActive: boolean
  createdAtUtc: string
}

export interface CreateSupplierRequest {
  name: string
  phoneNumber?: string | null
  email?: string | null
  address?: string | null
  description?: string | null
  openingBalance: number
}
