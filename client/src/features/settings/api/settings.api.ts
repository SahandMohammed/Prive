import { apiClient } from '@/lib/apiClient';
import type { 
  Item, CreateItemRequest, 
  ItemCategory, 
  UnitOfMeasure,
  BusinessSettingsDto,
  SetupBusinessRequest,
  UpdateBusinessSettingsRequest
} from '../types/settings.types';
import type { CreateWarehouseRequest, Warehouse } from '../types/settings.types';

export const settingsApi = {
  // Items
  listItems: (params: { page: number; pageSize: number; search?: string; type?: string; isActive?: boolean; sortBy?: string; sortDirection?: string }) => {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
    if (params.search) query.set('search', params.search)
    if (params.type) query.set('type', params.type)
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortDirection) query.set('sortDirection', params.sortDirection)
    return apiClient.getPaginated<Item>(`/items?${query}`)
  },
  createItem: (body: CreateItemRequest) => apiClient.post<Item>('/items', body),
  
  // Categories
  listCategories: () => apiClient.get<ItemCategory[]>('/item-categories'),
  createCategory: (body: { name: string, parentCategoryId?: string | null }) => apiClient.post<ItemCategory>('/item-categories', body),
  
  // Units of Measure
  listUnitsOfMeasure: () => apiClient.get<UnitOfMeasure[]>('/units-of-measure'),

  // Warehouses
  listWarehouses: (params: { page: number; pageSize: number; search?: string }) => {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
    if (params.search) query.set('search', params.search)
    return apiClient.getPaginated<Warehouse>(`/warehouses?${query}`)
  },
  createWarehouse: (body: CreateWarehouseRequest) => apiClient.post<Warehouse>('/warehouses', body),
  
  // Business Settings
  getBusinessSettings: () => apiClient.get<BusinessSettingsDto>('/business-settings'),
  setupBusinessSettings: (body: SetupBusinessRequest) => apiClient.post<BusinessSettingsDto>('/business-settings/setup', body),
  updateBusinessSettings: (body: UpdateBusinessSettingsRequest) => apiClient.put<BusinessSettingsDto>('/business-settings', body),
};
