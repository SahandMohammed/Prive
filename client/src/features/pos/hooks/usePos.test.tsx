import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCorrectPosSettlement, usePostPosRefund, useVoidPosSale } from './usePos'

const mocks = vi.hoisted(() => ({
  correctSettlement: vi.fn(),
  postRefund: vi.fn(),
  voidSale: vi.fn(),
}))

vi.mock('../api/pos.api', () => ({
  posApi: {
    correctSettlement: mocks.correctSettlement,
    postRefund: mocks.postRefund,
    voidSale: mocks.voidSale,
  },
}))

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...renderHook(hook, { wrapper }), invalidate }
}

function expectFinancialInvalidation(invalidate: ReturnType<typeof vi.spyOn>) {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['finance'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounting'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['pos', 'sessions'] })
}

describe('POS financial mutation invalidation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates payment-owned projections after settlement correction', async () => {
    mocks.correctSettlement.mockResolvedValue({ id: 'invoice-1' })
    const { result, invalidate } = setup(() => useCorrectPosSettlement('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({
        paymentMode: 0,
        collections: [],
        change: null,
        reason: 'Correct settlement',
        expectedUpdatedAtUtc: '2026-10-01T10:00:00Z',
      })
    })

    expectFinancialInvalidation(invalidate)
  })

  it('invalidates invoice, finance, and accounting projections after a refund', async () => {
    mocks.postRefund.mockResolvedValue({ id: 'refund-1', salesInvoiceId: 'invoice-1' })
    const { result, invalidate } = setup(usePostPosRefund)
    await act(async () => { await result.current.mutateAsync({ saleId: 'invoice-1', body: {} as never }) })
    expectFinancialInvalidation(invalidate)
  })

  it('invalidates invoice, finance, and accounting projections after a void', async () => {
    mocks.voidSale.mockResolvedValue({ id: 'refund-1', salesInvoiceId: 'invoice-1' })
    const { result, invalidate } = setup(useVoidPosSale)
    await act(async () => { await result.current.mutateAsync({ saleId: 'invoice-1', body: {} as never }) })
    expectFinancialInvalidation(invalidate)
  })
})
