import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '../api/contacts.api'
import type { ContactInput, ContactListParams } from '../types/contact.types'

export const CONTACTS_QUERY_KEY = ['contacts'] as const

export function useContacts(params: ContactListParams) {
  return useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, params],
    queryFn: () => contactsApi.list(params),
  })
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, id],
    queryFn: () => contactsApi.getById(id!),
    enabled: id !== null,
  })
}

export function useSaveContact(id: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ContactInput) => id
      ? contactsApi.update(id, input)
      : contactsApi.create(input),
    onSuccess: (contact) => {
      queryClient.setQueryData([...CONTACTS_QUERY_KEY, contact.id], contact)
      return queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY })
    },
  })
}

export function useSetContactActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => isActive
      ? contactsApi.activate(id)
      : contactsApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY }),
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY }),
  })
}
