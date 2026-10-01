import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  POS_Z_REPORT_KEY,
  POS_Z_REPORTS_KEY,
  useCorrectPosSettlement,
  usePostPosRefund,
  useVoidPosSale,
} from './usePos'

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

function expectZInvalidation(invalidate: ReturnType<typeof vi.spyOn>) {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: POS_Z_REPORTS_KEY })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: POS_Z_REPORT_KEY })
}

describe('POS financial mutation invalidation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates Z-report lists and details after settlement correction', async () => {
    mocks.correctSettlement.mockResolvedValue({ id: 'invoice-1', posSessionId: 'session-1' })
    const { result, invalidate } = setup(() => useCorrectPosSettlement('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({
        paymentMode: 0,
        tenders: [],
        change: null,
        reason: 'Correct settlement',
        expectedUpdatedAtUtc: '2026-10-01T10:00:00Z',
      })
    })

    expectZInvalidation(invalidate)
  })

  it('invalidates Z-report lists and details after a POS refund', async () => {
    mocks.postRefund.mockResolvedValue({ id: 'refund-1', salesInvoiceId: 'invoice-1', posSessionId: 'session-1' })
    const { result, invalidate } = setup(usePostPosRefund)

    await act(async () => {
      await result.current.mutateAsync({ saleId: 'invoice-1', body: {} as never })
    })

    expectZInvalidation(invalidate)
  })

  it('invalidates Z-report lists and details after a POS void', async () => {
    mocks.voidSale.mockResolvedValue({ id: 'refund-1', salesInvoiceId: 'invoice-1', posSessionId: 'session-1' })
    const { result, invalidate } = setup(useVoidPosSale)

    await act(async () => {
      await result.current.mutateAsync({ saleId: 'invoice-1', body: {} as never })
    })

    expectZInvalidation(invalidate)
  })
})
