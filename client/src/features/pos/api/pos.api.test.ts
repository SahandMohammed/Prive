import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { posApi } from './pos.api'
import { PosRefundReason } from '../types/pos.types'

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

describe('POS refund endpoints', () => {
  it('loads authoritative refundability and a refund receipt', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({})
    await posApi.refundability('sale-1')
    await posApi.refund('refund-1')
    expect(get).toHaveBeenNthCalledWith(1, '/pos/sales/sale-1/refundability')
    expect(get).toHaveBeenNthCalledWith(2, '/pos/refunds/refund-1')
  })

  it('loads the bounded refund history collection', async () => {
    const get = vi.spyOn(apiClient, 'getPaginated').mockResolvedValue({ data: [], meta: {} as never })
    await posApi.saleRefunds('sale-1')
    expect(get).toHaveBeenCalledWith('/pos/sales/sale-1/refunds?page=1&pageSize=100')
  })

  it('posts refund and void requests to distinct routes', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
    const refund = { posSessionId: 'session', reason: PosRefundReason.CustomerComplaint, notes: null, lines: [], refundTenders: [], clientRequestId: '00000000-0000-4000-8000-000000000001' }
    const voidRequest = { posSessionId: 'session', reason: PosRefundReason.DuplicateSale, notes: 'Duplicate', restockSalesInvoiceLineIds: ['line-1'], refundTenders: [], clientRequestId: '00000000-0000-4000-8000-000000000002' }
    await posApi.postRefund('sale-1', refund)
    await posApi.voidSale('sale-1', voidRequest)
    expect(post).toHaveBeenNthCalledWith(1, '/pos/sales/sale-1/refunds', refund)
    expect(post).toHaveBeenNthCalledWith(2, '/pos/sales/sale-1/void', voidRequest)
  })
})
