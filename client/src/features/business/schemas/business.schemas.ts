import { z } from 'zod'

const optionalText = z.string().trim().max(2048).or(z.literal('')).transform((value) => value || null)

export const businessSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required').max(200),
  legalName: optionalText,
  primaryPhoneNumber: z.string().trim().min(1, 'Primary phone number is required').max(50),
  secondaryPhoneNumber: z.string().trim().max(50).or(z.literal('')).transform((value) => value || null),
  email: z.string().trim().email('Enter a valid email address').max(254).or(z.literal('')).transform((value) => value || null),
  website: z.string().trim().url('Enter a valid website URL').max(2048).or(z.literal('')).transform((value) => value || null),
  address: z.string().trim().min(1, 'Address is required').max(500),
  city: z.string().trim().min(1, 'City is required').max(100),
  region: z.string().trim().min(1, 'Region is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  logoReference: optionalText,
  baseCurrencyId: z.string().uuid('Choose a base currency'),
  isSetupCompleted: z.boolean(),
})

export const currencySchema = z.object({
  code: z.string().trim().length(3, 'Use a three-letter currency code').transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, 'Currency name is required').max(100),
  symbol: z.string().trim().min(1, 'Currency symbol is required').max(10),
  decimalPlaces: z.number().int().min(0).max(6),
  isActive: z.boolean(),
})

export const branchSchema = z.object({
  code: z.string().trim().min(1, 'Branch code is required').max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, 'Branch name is required').max(200),
  phoneNumber: z.string().trim().max(50).or(z.literal('')).transform((value) => value || null),
  email: z.string().trim().email('Enter a valid email address').max(254).or(z.literal('')).transform((value) => value || null),
  address: z.string().trim().min(1, 'Address is required').max(500),
  city: z.string().trim().min(1, 'City is required').max(100),
  region: z.string().trim().min(1, 'Region is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  isMainBranch: z.boolean(),
  isActive: z.boolean(),
  catalogMode: z.enum(['Shared', 'Separate']),
})

export type BusinessFormValues = z.input<typeof businessSchema>
export type CurrencyFormValues = z.input<typeof currencySchema>
export type BranchFormValues = z.input<typeof branchSchema>
