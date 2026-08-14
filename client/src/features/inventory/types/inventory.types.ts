export const InventoryDocumentType = { OpeningStock: 0, Adjustment: 1, Transfer: 2 } as const
export type InventoryDocumentType = typeof InventoryDocumentType[keyof typeof InventoryDocumentType]
export const InventoryDocumentStatus = { Draft: 0, Posted: 1 } as const
export type InventoryDocumentStatus = typeof InventoryDocumentStatus[keyof typeof InventoryDocumentStatus]
export const StockMovementType = { OpeningStock: 0, PositiveAdjustment: 1, NegativeAdjustment: 2, TransferOut: 3, TransferIn: 4 } as const
export type StockMovementType = typeof StockMovementType[keyof typeof StockMovementType]

export interface StockBalance { productId: string; productName: string; sku: string; categoryName: string; unitCode: string; warehouseId: string; warehouseCode: string; warehouseName: string; branchId: string; branchName: string; quantity: number; averageCostBase: number; totalValueBase: number }
export interface Product { id: string; name: string; sku: string; barcode: string | null; categoryId: string; categoryName: string; unitOfMeasureId: string; unitCode: string; purpose: number; trackInventory: boolean; isActive: boolean; description: string | null; totalQuantity: number; averageCostBase: number; totalValueBase: number }
export interface Warehouse { id: string; code: string; name: string; branchId: string; branchCode: string; branchName: string; isActive: boolean }
export interface Category { id: string; name: string; isActive: boolean }
export interface Unit { id: string; name: string; code: string; isActive: boolean }

export interface Movement { id: string; movementDate: string; type: StockMovementType; productId: string; productName: string; sku: string; unitCode: string; warehouseId: string; warehouseCode: string; warehouseName: string; branchId: string; branchName: string; quantityIn: number; quantityOut: number; unitCostBase: number; reference: string | null; note: string | null; sourceDocumentType: InventoryDocumentType | null; sourceDocumentId: string | null; sourceDocumentLineId: string | null; documentNumber: string | null; performedByUserId: string; performedByUsername: string; createdAtUtc: string }

interface DocumentAudit { id: string; documentNumber: string; documentDate: string; branchId: string; branchName: string; status: InventoryDocumentStatus; createdByUserId: string; createdByUsername: string; createdAtUtc: string; updatedAtUtc: string; postedAtUtc: string | null; lineCount: number }
export interface OpeningStockSummary extends DocumentAudit { warehouseId: string; warehouseName: string; totalValueBase: number }
export interface AdjustmentSummary extends DocumentAudit { warehouseId: string; warehouseName: string; reason: string }
export interface TransferSummary extends DocumentAudit { sourceWarehouseId: string; sourceWarehouseName: string; destinationWarehouseId: string; destinationWarehouseName: string }

export interface OpeningStockLine { id: string; productId: string; productName: string; sku: string; unitCode: string; quantity: number; unitCostBase: number; lineValueBase: number }
export interface OpeningStockDocument extends OpeningStockSummary { branchCode: string; warehouseCode: string; notes: string | null; lines: OpeningStockLine[] }
export interface AdjustmentLine { id: string; productId: string; productName: string; sku: string; unitCode: string; systemQuantity: number; actualQuantity: number; difference: number }
export interface AdjustmentDocument extends AdjustmentSummary { branchCode: string; warehouseCode: string; notes: string | null; lines: AdjustmentLine[] }
export interface TransferLine { id: string; productId: string; productName: string; sku: string; unitCode: string; availableSourceQuantity: number; quantity: number }
export interface TransferDocument extends TransferSummary { branchCode: string; sourceWarehouseCode: string; destinationWarehouseCode: string; notes: string | null; lines: TransferLine[] }

export interface ProductInput { name: string; sku: string; barcode: string | null; categoryId: string; unitOfMeasureId: string; purpose: number; trackInventory: boolean; isActive: boolean; description: string | null; imageReference: string | null }
export interface WarehouseInput { code: string; name: string; branchId: string; isActive: boolean }
export interface CategoryInput { name: string; isActive: boolean }
export interface UnitInput { name: string; code: string; isActive: boolean }
export interface OpeningStockDraftInput { branchId: string; warehouseId: string; documentDate: string; notes: string | null; lines: { productId: string; quantity: number; unitCostBase: number }[] }
export interface AdjustmentDraftInput { branchId: string; warehouseId: string; documentDate: string; reason: string; notes: string | null; lines: { productId: string; actualQuantity: number }[] }
export interface TransferDraftInput { branchId: string; sourceWarehouseId: string; destinationWarehouseId: string; documentDate: string; notes: string | null; lines: { productId: string; quantity: number }[] }
