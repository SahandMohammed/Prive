import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { salesApi } from './sales.api'
import type { PostedSalesInvoiceInput, SalesInvoiceDraftInput } from '../types/sales.types'

afterEach(() => vi.restoreAllMocks())

describe('active sales invoice lifecycle endpoints', () => {
  it('uses the active create, edit, and delete contracts', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({})
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({})
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)
    const create = {
      customerId: 'customer-1',
      invoiceDate: '2026-09-28',
      branchId: 'branch-1',
      warehouseId: null,
      currencyId: 'currency-1',
      exchangeRate: null,
      notes: null,
      lines: [],
    } satisfies SalesInvoiceDraftInput
    const update = {
      ...create,
      expectedUpdatedAtUtc: '2026-09-28T10:00:00Z',
      posSettlement: null,
    } satisfies PostedSalesInvoiceInput
    const deletion = { reason: 'Entered in error', expectedUpdatedAtUtc: update.expectedUpdatedAtUtc }

    await salesApi.createActiveInvoice(create)
    await salesApi.updateActiveInvoice('invoice-1', update)
    await salesApi.deleteActiveInvoice('invoice-1', deletion)

    expect(post).toHaveBeenCalledOnce()
    expect(post).toHaveBeenCalledWith('/sales/invoices/active', create)
    expect(put).toHaveBeenCalledWith('/sales/invoices/invoice-1/active', update)
    expect(remove).toHaveBeenCalledWith('/sales/invoices/invoice-1/active', deletion)
  })
})
