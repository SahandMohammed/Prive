import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory.api'
import type { AdjustmentDraftInput, CategoryInput, OpeningStockDraftInput, ProductInput, TransferDraftInput, UnitInput, WarehouseInput } from '../types/inventory.types'

export const useStockBalances = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'balances', filters], queryFn: () => inventoryApi.balances(filters) })
export const useProducts = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'products', filters], queryFn: () => inventoryApi.products(filters) })
export const useWarehouses = () => useQuery({ queryKey: ['inventory', 'warehouses'], queryFn: inventoryApi.warehouses })
export const useCategories = () => useQuery({ queryKey: ['inventory', 'categories'], queryFn: inventoryApi.categories })
export const useUnits = () => useQuery({ queryKey: ['inventory', 'units'], queryFn: inventoryApi.units })
export const useMovements = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'movements', filters], queryFn: () => inventoryApi.movements(filters) })

export const useOpeningStocks = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'opening-stock', filters], queryFn: () => inventoryApi.openingStocks(filters) })
export const useOpeningStock = (id?: string) => useQuery({ queryKey: ['inventory', 'opening-stock', id], queryFn: () => inventoryApi.openingStock(id!), enabled: Boolean(id) })
export const useAdjustments = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'adjustments', filters], queryFn: () => inventoryApi.adjustments(filters) })
export const useAdjustment = (id?: string) => useQuery({ queryKey: ['inventory', 'adjustments', id], queryFn: () => inventoryApi.adjustment(id!), enabled: Boolean(id) })
export const useTransfers = (filters: Record<string, string | undefined> = {}) => useQuery({ queryKey: ['inventory', 'transfers', filters], queryFn: () => inventoryApi.transfers(filters) })
export const useTransfer = (id?: string) => useQuery({ queryKey: ['inventory', 'transfers', id], queryFn: () => inventoryApi.transfer(id!), enabled: Boolean(id) })

export function useSaveOpeningStock(id?: string) { const client = useQueryClient(); return useMutation({ mutationFn: (body: OpeningStockDraftInput) => id ? inventoryApi.updateOpeningStock(id, body) : inventoryApi.createOpeningStock(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }
export function useSaveAdjustment(id?: string) { const client = useQueryClient(); return useMutation({ mutationFn: (body: AdjustmentDraftInput) => id ? inventoryApi.updateAdjustment(id, body) : inventoryApi.createAdjustment(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }
export function useSaveTransfer(id?: string) { const client = useQueryClient(); return useMutation({ mutationFn: (body: TransferDraftInput) => id ? inventoryApi.updateTransfer(id, body) : inventoryApi.createTransfer(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }
export function useDocumentAction(type: 'opening-stock' | 'adjustments' | 'transfers', action: 'post' | 'delete') { const client = useQueryClient(); return useMutation<unknown, Error, string>({ mutationFn: async (id) => { if (type === 'opening-stock') return action === 'post' ? inventoryApi.postOpeningStock(id) : inventoryApi.deleteOpeningStock(id); if (type === 'adjustments') return action === 'post' ? inventoryApi.postAdjustment(id) : inventoryApi.deleteAdjustment(id); return action === 'post' ? inventoryApi.postTransfer(id) : inventoryApi.deleteTransfer(id) }, onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }

export function useSaveCategory(editingId: string | null) { const client = useQueryClient(); return useMutation({ mutationFn: (body: CategoryInput) => editingId ? inventoryApi.updateCategory(editingId, body) : inventoryApi.createCategory(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory', 'categories'] }) }) }
export function useSaveUnit(editingId: string | null) { const client = useQueryClient(); return useMutation({ mutationFn: (body: UnitInput) => editingId ? inventoryApi.updateUnit(editingId, body) : inventoryApi.createUnit(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory', 'units'] }) }) }
export function useSaveProduct(editingId: string | null) { const client = useQueryClient(); return useMutation({ mutationFn: (body: ProductInput) => editingId ? inventoryApi.updateProduct(editingId, body) : inventoryApi.createProduct(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }
export function useSaveWarehouse(editingId: string | null) { const client = useQueryClient(); return useMutation({ mutationFn: (body: WarehouseInput) => editingId ? inventoryApi.updateWarehouse(editingId, body) : inventoryApi.createWarehouse(body), onSuccess: () => client.invalidateQueries({ queryKey: ['inventory'] }) }) }
