import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { posApi } from './pos.api'

afterEach(() => vi.restoreAllMocks())

describe('POS register lookup', () => {
  it('loads later pages so the opening selector does not hide registers', async () => {
    const first = { id: 'first', code: 'A', name: 'A', branchId: 'branch', isActive: true }
    const last = { ...first, id: 'last', code: 'Z', name: 'Z' }
    const meta = { page: 1, pageSize: 100, totalCount: 101, totalPages: 2, hasPreviousPage: false, hasNextPage: true }
    const get = vi.spyOn(apiClient, 'getPaginated')
      .mockResolvedValueOnce({ data: [first], meta })
      .mockResolvedValueOnce({ data: [last], meta: { ...meta, page: 2, hasPreviousPage: true, hasNextPage: false } })
    expect(await posApi.registers(true)).toEqual([first, last])
    expect(get).toHaveBeenNthCalledWith(1, '/pos/registers?includeInactive=true&page=1&pageSize=100')
    expect(get).toHaveBeenNthCalledWith(2, '/pos/registers?includeInactive=true&page=2&pageSize=100')
  })
})
