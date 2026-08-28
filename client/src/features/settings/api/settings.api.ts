import { apiClient } from '@/lib/apiClient';
import type { 
  BusinessSettingsDto,
  SetupBusinessRequest,
  UpdateBusinessSettingsRequest
} from '../types/settings.types';

export const settingsApi = {
  // Business Settings
  getBusinessSettings: () => apiClient.get<BusinessSettingsDto>('/business-settings'),
  setupBusinessSettings: (body: SetupBusinessRequest) => apiClient.post<BusinessSettingsDto>('/business-settings/setup', body),
  updateBusinessSettings: (body: UpdateBusinessSettingsRequest) => apiClient.put<BusinessSettingsDto>('/business-settings', body),
};
