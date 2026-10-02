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

export const ProfessionalPerformancePeriod = { Today: 0, ThisWeek: 1, ThisMonth: 2, Custom: 3 } as const
export type ProfessionalPerformancePeriod = typeof ProfessionalPerformancePeriod[keyof typeof ProfessionalPerformancePeriod]

export const ProfessionalPerformanceSource = { All: 0, Pos: 1, Manual: 2 } as const
export type ProfessionalPerformanceSource = typeof ProfessionalPerformanceSource[keyof typeof ProfessionalPerformanceSource]

export interface ProfessionalPerformanceParams {
  period: ProfessionalPerformancePeriod
  fromDate?: string
  toDate?: string
  professionalId?: string
  serviceId?: string
  source?: ProfessionalPerformanceSource
}

export interface ProfessionalPerformanceRow {
  professionalId: string
  professionalName: string
  serviceQuantity: number
  visitsServed: number
  grossValueBase: number
  refundValueBase: number
  netValueBase: number
}

export interface ProfessionalPerformance {
  fromDate: string
  toDate: string
  baseCurrencyId: string
  baseCurrencyCode: string
  rows: ProfessionalPerformanceRow[]
}
