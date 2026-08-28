import { z } from 'zod'
import { SalesLineType } from '../types/sales.types'

const requiredId = z.string().uuid('Select a value')

export const serviceCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Maximum 100 characters'),
  isActive: z.boolean(),
})

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Maximum 200 characters'),
  categoryId: requiredId,
  sellingPriceBase: z.number().min(0, 'Selling price cannot be negative'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least one minute').max(1440),
  revenueAccountId: requiredId,
  isActive: z.boolean(),
  description: z.string().max(1000, 'Maximum 1000 characters'),
})

const salesLineSchema = z.object({
  lineType: z.union([z.literal(SalesLineType.Service), z.literal(SalesLineType.Product)]),
  serviceId: z.string(),
  productId: z.string(),
  unitOfMeasureId: z.string(),
  description: z.string().max(500, 'Maximum 500 characters'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  unitPriceBase: z.number().min(0),
  useMasterPrice: z.boolean(),
}).superRefine((line, context) => {
  if (line.lineType === SalesLineType.Service && !z.string().uuid().safeParse(line.serviceId).success)
    context.addIssue({ code: 'custom', path: ['serviceId'], message: 'Select a Service' })
  if (line.lineType === SalesLineType.Product && !z.string().uuid().safeParse(line.productId).success)
    context.addIssue({ code: 'custom', path: ['productId'], message: 'Select a Product' })
  if (line.lineType === SalesLineType.Product && !z.string().uuid().safeParse(line.unitOfMeasureId).success)
    context.addIssue({ code: 'custom', path: ['unitOfMeasureId'], message: 'Select a Unit' })
})

export const salesInvoiceSchema = z.object({
  customerId: z.string(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  branchId: requiredId,
  warehouseId: z.string(),
  currencyId: requiredId,
  exchangeRate: z.number().positive('Exchange rate must be greater than zero').nullable(),
  notes: z.string().max(1000, 'Maximum 1000 characters'),
  lines: z.array(salesLineSchema).min(1, 'Add at least one Service or Product'),
}).superRefine((invoice, context) => {
  if (invoice.lines.some((line) => line.lineType === SalesLineType.Product)
    && !z.string().uuid().safeParse(invoice.warehouseId).success)
    context.addIssue({ code: 'custom', path: ['warehouseId'], message: 'Select a warehouse for Product lines' })
})
