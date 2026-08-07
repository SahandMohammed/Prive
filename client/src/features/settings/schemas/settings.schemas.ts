import { z } from 'zod';

export const createItemSchema = z.object({
  code: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Item name is required'),
  type: z.enum(['Product', 'Service']),
  basePrice: z.number().min(0, 'Price must be non-negative'),
  baseCost: z.number().min(0, 'Cost must be non-negative'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional().nullable(),
  baseUnitOfMeasureId: z.string().min(1, 'Base unit of measure is required'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute').nullable().optional(),
  trackInventory: z.boolean(),
  description: z.string().nullable().optional(),
  additionalUnits: z.array(z.object({
    unitOfMeasureId: z.string().uuid(),
    conversionFactor: z.number().min(0.0001, 'Factor must be greater than 0'),
    isDefaultForPurchasing: z.boolean(),
    isDefaultForSelling: z.boolean(),
  })).optional()
}).superRefine((val, ctx) => {
  if (val.type === 'Service' && !val.durationMinutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Duration is required for Services',
      path: ['durationMinutes']
    });
  }
  if (val.type === 'Service' && val.trackInventory) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Services cannot track inventory', path: ['trackInventory'] });
  }
});

export type CreateItemFormValues = z.infer<typeof createItemSchema>;

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1, 'Warehouse code is required').max(50),
  name: z.string().trim().min(1, 'Warehouse name is required'),
  address: z.string().trim().max(500).optional(),
});

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>;
