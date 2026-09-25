export interface ProfessionalBranch {
  id: string
  code: string
  name: string
}

export interface ProfessionalLinkedUser {
  id: string
  username: string
  isActive: boolean
}

export interface Professional {
  id: string
  name: string
  phoneNumber: string | null
  email: string | null
  notes: string | null
  isActive: boolean
  branches: ProfessionalBranch[]
  linkedUser: ProfessionalLinkedUser | null
}

export interface ProfessionalInput {
  name: string
  phoneNumber: string | null
  email: string | null
  notes: string | null
  branchIds: string[]
  linkedUserId: string | null
  isActive: boolean
}

export interface ProfessionalListParams {
  page: number
  pageSize: number
  search?: string
  isActive?: boolean
  branchId?: string
}

export interface ProfessionalUserOption {
  id: string
  username: string
  isActive: boolean
}
