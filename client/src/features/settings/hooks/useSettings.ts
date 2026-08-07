import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.api';

export const ITEMS_QUERY_KEY = ['items'] as const;
export const CATEGORIES_QUERY_KEY = ['item-categories'] as const;
export const UOM_QUERY_KEY = ['units-of-measure'] as const;
export const BUSINESS_SETTINGS_QUERY_KEY = ['business-settings'] as const;
export const WAREHOUSES_QUERY_KEY = ['warehouses'] as const;

export function useItems(query: { page: number; pageSize: number; search?: string; type?: string; isActive?: boolean; sortBy?: string; sortDirection?: string }) {
  return useQuery({
    queryKey: [...ITEMS_QUERY_KEY, query],
    queryFn: () => settingsApi.listItems(query),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: settingsApi.listCategories,
  });
}

export function useUnitsOfMeasure() {
  return useQuery({
    queryKey: UOM_QUERY_KEY,
    queryFn: settingsApi.listUnitsOfMeasure,
  });
}

export function useWarehouses(query: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: [...WAREHOUSES_QUERY_KEY, query],
    queryFn: () => settingsApi.listWarehouses(query),
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY });
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

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
