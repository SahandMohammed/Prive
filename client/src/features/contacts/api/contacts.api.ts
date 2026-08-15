import { apiClient } from '@/lib/apiClient'
import type { Contact, ContactInput, ContactListParams } from '../types/contact.types'

export const contactsApi = {
  list: (params: ContactListParams) => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })

    if (params.search) query.set('search', params.search)
    if (params.role !== undefined) query.set('role', String(params.role))
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
    if (params.kind !== undefined) query.set('kind', String(params.kind))

    return apiClient.getPaginated<Contact>(`/contacts?${query}`)
  },
  getById: (id: string) => apiClient.get<Contact>(`/contacts/${id}`),
  create: (body: ContactInput) => apiClient.post<Contact>('/contacts', body),
  update: (id: string, body: ContactInput) => apiClient.put<Contact>(`/contacts/${id}`, body),
  activate: (id: string) => apiClient.post<void>(`/contacts/${id}/activate`),
  deactivate: (id: string) => apiClient.post<void>(`/contacts/${id}/deactivate`),
  delete: (id: string) => apiClient.delete<void>(`/contacts/${id}`),
}
