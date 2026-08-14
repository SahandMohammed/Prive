import { apiClient } from '@/lib/apiClient'
import type { AdjustmentDocument, AdjustmentDraftInput, AdjustmentSummary, Category, CategoryInput, Movement, OpeningStockDocument, OpeningStockDraftInput, OpeningStockSummary, Product, ProductInput, StockBalance, TransferDocument, TransferDraftInput, TransferSummary, Unit, UnitInput, Warehouse, WarehouseInput } from '../types/inventory.types'

const params = (value: Record<string, string | undefined>) => { const q = new URLSearchParams(); Object.entries(value).forEach(([k, v]) => v && q.set(k, v)); return q.toString() ? `?${q}` : '' }
const listParams = (filter: Record<string, string | undefined>) => params({ page: '1', pageSize: '100', ...filter })

export const inventoryApi = {
  balances: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<StockBalance>(`/inventory/balances${listParams(filter)}`),
  products: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<Product>(`/inventory/products${listParams(filter)}`),
  warehouses: () => apiClient.getPaginated<Warehouse>('/inventory/warehouses?page=1&pageSize=100'),
  categories: () => apiClient.getPaginated<Category>('/inventory/categories?page=1&pageSize=100'),
  units: () => apiClient.getPaginated<Unit>('/inventory/units?page=1&pageSize=100'),
  movements: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<Movement>(`/inventory/movements${listParams(filter)}`),
  createCategory: (body: CategoryInput) => apiClient.post<Category>('/inventory/categories', body),
  updateCategory: (id: string, body: CategoryInput) => apiClient.put<Category>(`/inventory/categories/${id}`, body),
  createUnit: (body: UnitInput) => apiClient.post<Unit>('/inventory/units', body),
  updateUnit: (id: string, body: UnitInput) => apiClient.put<Unit>(`/inventory/units/${id}`, body),
  createProduct: (body: ProductInput) => apiClient.post<Product>('/inventory/products', body),
  updateProduct: (id: string, body: ProductInput) => apiClient.put<Product>(`/inventory/products/${id}`, body),
  deleteProduct: (id: string) => apiClient.delete<void>(`/inventory/products/${id}`),
  createWarehouse: (body: WarehouseInput) => apiClient.post<Warehouse>('/inventory/warehouses', body),
  updateWarehouse: (id: string, body: WarehouseInput) => apiClient.put<Warehouse>(`/inventory/warehouses/${id}`, body),

  openingStocks: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<OpeningStockSummary>(`/inventory/opening-stock${listParams(filter)}`),
  openingStock: (id: string) => apiClient.get<OpeningStockDocument>(`/inventory/opening-stock/${id}`),
  createOpeningStock: (body: OpeningStockDraftInput) => apiClient.post<OpeningStockDocument>('/inventory/opening-stock', body),
  updateOpeningStock: (id: string, body: OpeningStockDraftInput) => apiClient.put<OpeningStockDocument>(`/inventory/opening-stock/${id}`, body),
  deleteOpeningStock: (id: string) => apiClient.delete<void>(`/inventory/opening-stock/${id}`),
  postOpeningStock: (id: string) => apiClient.post<OpeningStockDocument>(`/inventory/opening-stock/${id}/post`),

  adjustments: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<AdjustmentSummary>(`/inventory/adjustments${listParams(filter)}`),
  adjustment: (id: string) => apiClient.get<AdjustmentDocument>(`/inventory/adjustments/${id}`),
  createAdjustment: (body: AdjustmentDraftInput) => apiClient.post<AdjustmentDocument>('/inventory/adjustments', body),
  updateAdjustment: (id: string, body: AdjustmentDraftInput) => apiClient.put<AdjustmentDocument>(`/inventory/adjustments/${id}`, body),
  deleteAdjustment: (id: string) => apiClient.delete<void>(`/inventory/adjustments/${id}`),
  postAdjustment: (id: string) => apiClient.post<AdjustmentDocument>(`/inventory/adjustments/${id}/post`),

  transfers: (filter: Record<string, string | undefined> = {}) => apiClient.getPaginated<TransferSummary>(`/inventory/transfers${listParams(filter)}`),
  transfer: (id: string) => apiClient.get<TransferDocument>(`/inventory/transfers/${id}`),
  createTransfer: (body: TransferDraftInput) => apiClient.post<TransferDocument>('/inventory/transfers', body),
  updateTransfer: (id: string, body: TransferDraftInput) => apiClient.put<TransferDocument>(`/inventory/transfers/${id}`, body),
  deleteTransfer: (id: string) => apiClient.delete<void>(`/inventory/transfers/${id}`),
  postTransfer: (id: string) => apiClient.post<TransferDocument>(`/inventory/transfers/${id}/post`),
}
