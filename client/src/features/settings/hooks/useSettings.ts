import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.api';

export const BUSINESS_SETTINGS_QUERY_KEY = ['business-settings'] as const;

export function useBusinessSettings() {
  return useQuery({
    queryKey: BUSINESS_SETTINGS_QUERY_KEY,
    queryFn: settingsApi.getBusinessSettings,
  });
}

export function useSetupBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.setupBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SETTINGS_QUERY_KEY });
    },
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.updateBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_SETTINGS_QUERY_KEY });
    },
  });
}
