import { apiClient } from '@/lib/apiClient';
import type { 
  Item, CreateItemRequest, 
  ItemCategory, 
  UnitOfMeasure,
  BusinessSettingsDto,
  SetupBusinessRequest,
  UpdateBusinessSettingsRequest
} from '../types/settings.types';

export const settingsApi = {
  // Items
  listItems: () => apiClient.get<Item[]>('/items'),
  createItem: (body: CreateItemRequest) => apiClient.post<Item>('/items', body),
  
  // Categories
  listCategories: () => apiClient.get<ItemCategory[]>('/item-categories'),
  createCategory: (body: { name: string, parentCategoryId?: string | null }) => apiClient.post<ItemCategory>('/item-categories', body),
  
  // Units of Measure
  listUnitsOfMeasure: () => apiClient.get<UnitOfMeasure[]>('/units-of-measure'),
  
  // Business Settings
  getBusinessSettings: () => apiClient.get<BusinessSettingsDto>('/business-settings'),
  setupBusinessSettings: (body: SetupBusinessRequest) => apiClient.post<BusinessSettingsDto>('/business-settings/setup', body),
  updateBusinessSettings: (body: UpdateBusinessSettingsRequest) => apiClient.put<BusinessSettingsDto>('/business-settings', body),
};
