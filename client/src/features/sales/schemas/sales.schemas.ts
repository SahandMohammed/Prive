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
  lineType: z.union([z.literal(SalesLineType.Service), z.literal(SalesLineType.Product)]).optional(),
  itemId: z.string().optional(),
  serviceId: z.string().optional(),
  productId: z.string().optional(),
  unitOfMeasureId: z.string().optional(),
  description: z.string().max(500, 'Maximum 500 characters').optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  unitPriceBase: z.number().min(0).optional(),
  useMasterPrice: z.boolean().optional(),
}).superRefine((line, context) => {
  const chosenId = line.itemId || line.serviceId || line.productId
  if (!chosenId || !z.string().uuid().safeParse(chosenId).success) {
    context.addIssue({ code: 'custom', path: ['itemId'], message: 'Select an item' })
    if (line.lineType === SalesLineType.Product) {
      context.addIssue({ code: 'custom', path: ['productId'], message: 'Select a Product' })
    } else {
      context.addIssue({ code: 'custom', path: ['serviceId'], message: 'Select a Service' })
    }
  }
})

export const salesInvoiceSchema = z.object({
  customerId: z.string(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  branchId: requiredId,
  warehouseId: z.string(),
  currencyId: requiredId,
  exchangeRate: z.number().positive('Exchange rate must be greater than zero').nullable(),
  notes: z.string().max(1000, 'Maximum 1000 characters'),
  lines: z.array(salesLineSchema).min(1, 'Add at least one item'),
  payments: z.array(z.object({
    paymentDate: z.string().min(1, 'Payment date is required'),
    moneyAccountId: requiredId,
    amount: z.number().positive('Amount must be greater than zero'),
    exchangeRate: z.number().positive('Exchange rate must be greater than zero').nullable(),
    notes: z.string().max(1000, 'Maximum 1000 characters'),
  })),
}).superRefine((invoice, context) => {
  if (invoice.lines.some((line) => line.lineType === SalesLineType.Product && (line.productId || line.itemId))
    && !z.string().uuid().safeParse(invoice.warehouseId).success)
    context.addIssue({ code: 'custom', path: ['warehouseId'], message: 'Select a warehouse for Product lines' })
  const invoiceTotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const paymentTotal = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  if (paymentTotal > invoiceTotal) {
    context.addIssue({ code: 'custom', path: ['payments'], message: 'Embedded Payments cannot exceed the invoice total' })
  }
})
