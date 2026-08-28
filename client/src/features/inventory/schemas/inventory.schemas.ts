import { z } from 'zod'

const requiredId = z.string().uuid('Select a value')
export const categorySchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), isActive: z.boolean() })
export const subcategorySchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), categoryId: requiredId, isActive: z.boolean() })
export const unitSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), code: z.string().trim().min(1, 'Code is required').max(20), isActive: z.boolean() })
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(250),
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  barcode: z.string().max(64),
  categoryId: requiredId,
  subcategoryId: z.string(),
  unitOfMeasureId: requiredId,
  purpose: z.number().min(0).max(2),
  purchasePriceBase: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPriceBase: z.number().min(0, 'Selling price cannot be negative'),
  trackInventory: z.boolean(),
  isActive: z.boolean(),
  description: z.string().max(1000),
  unitConversions: z.array(z.object({
    unitOfMeasureId: requiredId,
    operation: z.union([z.literal(0), z.literal(1)]),
    factor: z.number().positive('Factor must be greater than zero'),
  })),
}).superRefine((value, context) => {
  const unitIds = value.unitConversions.map((conversion) => conversion.unitOfMeasureId)
  if (unitIds.includes(value.unitOfMeasureId)) context.addIssue({ code: 'custom', path: ['unitConversions'], message: 'The base unit cannot also be a conversion unit' })
  if (new Set(unitIds).size !== unitIds.length) context.addIssue({ code: 'custom', path: ['unitConversions'], message: 'Each conversion unit can be selected only once' })
})
export const warehouseSchema = z.object({ code: z.string().trim().min(1, 'Code is required'), name: z.string().trim().min(1, 'Name is required'), branchId: requiredId, isActive: z.boolean() })
export const openingStockSchema = z.object({ branchId: requiredId, warehouseId: requiredId, documentDate: z.string().min(1, 'Date is required'), notes: z.string(), lines: z.array(z.object({ productId: requiredId, quantity: z.number().positive('Quantity must be positive'), unitCostBase: z.number().min(0, 'Cost cannot be negative') })).min(1, 'Add at least one product') })
export const adjustmentSchema = z.object({ branchId: requiredId, warehouseId: requiredId, documentDate: z.string().min(1, 'Date is required'), reason: z.string().trim().min(1, 'A meaningful reason is required').max(500), notes: z.string(), lines: z.array(z.object({ productId: requiredId, actualQuantity: z.number().min(0, 'Actual quantity cannot be negative') })).min(1, 'Add at least one product') })
export const transferSchema = z.object({ branchId: requiredId, sourceWarehouseId: requiredId, destinationWarehouseId: requiredId, documentDate: z.string().min(1, 'Date is required'), notes: z.string(), lines: z.array(z.object({ productId: requiredId, quantity: z.number().positive('Transfer quantity must be positive') })).min(1, 'Add at least one product') }).refine((value) => value.sourceWarehouseId !== value.destinationWarehouseId, { path: ['destinationWarehouseId'], message: 'Destination must differ from source' })
