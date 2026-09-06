import { beforeEach, expect, it, vi } from 'vitest'

const { client } = vi.hoisted(() => ({ client: {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
} }))
vi.mock('axios', () => ({ default: { create: () => client }, isAxiosError: () => false }))
vi.mock('./env', () => ({ env: { VITE_API_BASE_URL: 'https://example.test/api/v1' } }))
import { apiClient, setAccessToken, setBranchId } from './apiClient'

beforeEach(() => {
  vi.clearAllMocks()
  setAccessToken(null)
  for (const method of [client.get, client.post, client.put, client.delete]) method.mockResolvedValue({ data: { success: true, data: {} } })
})

it('sends selected branch scope on reads, creates, updates, and deletes', async () => {
  setBranchId('branch-a')
  await apiClient.get('/sales/invoices')
  await apiClient.post('/sales/invoices', { branchId: 'branch-a' })
  await apiClient.put('/sales/invoices/id', {})
  await apiClient.delete('/sales/invoices/id')
  for (const method of [client.get, client.post, client.put, client.delete]) {
    expect(method.mock.calls[0].at(-1)).toEqual({ headers: { 'X-Branch-Id': 'branch-a' } })
  }
})

it('snapshots scope per request so an old request cannot move to a newly selected branch', async () => {
  setBranchId('branch-a')
  const first = apiClient.get('/stock')
  setBranchId('branch-b')
  const second = apiClient.get('/stock')
  await Promise.all([first, second])
  expect(client.get.mock.calls[0][1].headers['X-Branch-Id']).toBe('branch-a')
  expect(client.get.mock.calls[1][1].headers['X-Branch-Id']).toBe('branch-b')
})

it('clears branch scope together with an expired auth session', async () => {
  setBranchId('branch-a')
  setAccessToken(null)
  await apiClient.get('/users/me')
  expect(client.get.mock.calls[0][1].headers).toEqual({})
})
