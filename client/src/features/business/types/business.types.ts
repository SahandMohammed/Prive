export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isActive: boolean
}

export interface CurrencyInput {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isActive: boolean
}

export interface Business {
  id: string
  name: string
  legalName: string | null
  primaryPhoneNumber: string
  secondaryPhoneNumber: string | null
  email: string | null
  website: string | null
  address: string
  city: string
  region: string
  country: string
  logoReference: string | null
  timeZoneId: string
  receiptFooter: string | null
  receiptPaperWidth: 'Mm58' | 'Mm80'
  baseCurrencyId: string
  baseCurrencyCode: string
  baseCurrencySymbol: string
  baseCurrencyDecimalPlaces: number
  isSetupCompleted: boolean
}

export interface BusinessInput {
  name: string
  legalName: string | null
  primaryPhoneNumber: string
  secondaryPhoneNumber: string | null
  email: string | null
  website: string | null
  address: string
  city: string
  region: string
  country: string
  logoReference: string | null
  timeZoneId: string
  receiptFooter: string | null
  receiptPaperWidth: 'Mm58' | 'Mm80'
  baseCurrencyId: string
  isSetupCompleted: boolean
}

export interface Branch {
  id: string
  code: string
  name: string
  phoneNumber: string | null
  email: string | null
  address: string
  city: string
  region: string
  country: string
  isMainBranch: boolean
  isActive: boolean
  catalogMode: 'Shared' | 'Separate'
}

export interface BranchInput {
  code: string
  name: string
  phoneNumber: string | null
  email: string | null
  address: string
  city: string
  region: string
  country: string
  isMainBranch: boolean
  isActive: boolean
  catalogMode: 'Shared' | 'Separate'
}
