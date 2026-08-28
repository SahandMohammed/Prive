import { z } from 'zod'

const requiredId = z.string().uuid('Select a value')

export const purchaseInvoiceSchema = z.object({
  supplierId: requiredId,
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  supplierReference: z.string().max(100, 'Maximum 100 characters'),
  branchId: requiredId,
  warehouseId: requiredId,
  currencyId: requiredId,
  exchangeRate: z.number().positive('Exchange rate must be greater than zero').nullable(),
  notes: z.string().max(1000, 'Maximum 1000 characters'),
  lines: z.array(z.object({
    productId: requiredId,
    unitOfMeasureId: requiredId,
    quantity: z.number().positive('Quantity must be greater than zero'),
    unitCost: z.number().min(0, 'Unit cost cannot be negative'),
    unitCostBase: z.number().min(0),
    useMasterPrice: z.boolean(),
  })).min(1, 'Add at least one product'),
})
