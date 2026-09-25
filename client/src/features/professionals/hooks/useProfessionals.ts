import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { professionalsApi } from '../api/professionals.api'
import type { ProfessionalInput, ProfessionalListParams } from '../types/professionals.types'

export const PROFESSIONALS_QUERY_KEY = ['professionals'] as const

export function useProfessionals(params: ProfessionalListParams) {
  return useQuery({ queryKey: [...PROFESSIONALS_QUERY_KEY, params], queryFn: () => professionalsApi.list(params) })
}

export function useProfessional(id: string | null) {
  return useQuery({ queryKey: [...PROFESSIONALS_QUERY_KEY, id], queryFn: () => professionalsApi.getById(id!), enabled: id !== null })
}

export function useProfessionalUserOptions(professionalId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...PROFESSIONALS_QUERY_KEY, 'user-options', professionalId],
    queryFn: () => professionalsApi.userOptions(professionalId),
    enabled,
  })
}

export function useSaveProfessional(id: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfessionalInput) => id ? professionalsApi.update(id, input) : professionalsApi.create(input),
    onSuccess: (professional) => {
      queryClient.setQueryData([...PROFESSIONALS_QUERY_KEY, professional.id], professional)
      return queryClient.invalidateQueries({ queryKey: PROFESSIONALS_QUERY_KEY })
    },
  })
}

export function useSetProfessionalActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => isActive
      ? professionalsApi.activate(id)
      : professionalsApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFESSIONALS_QUERY_KEY }),
  })
}

export function useDeleteProfessional() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: professionalsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFESSIONALS_QUERY_KEY }),
  })
}
