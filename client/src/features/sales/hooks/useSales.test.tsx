import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteActiveSalesInvoice, useUpdateActiveSalesInvoice } from './useSales'

const mocks = vi.hoisted(() => ({
  updateActiveInvoice: vi.fn(),
  deleteActiveInvoice: vi.fn(),
}))

vi.mock('../api/sales.api', () => ({
  salesApi: {
    updateActiveInvoice: mocks.updateActiveInvoice,
    deleteActiveInvoice: mocks.deleteActiveInvoice,
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

function expectCommercialInvalidation(invalidate: ReturnType<typeof vi.spyOn>) {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['inventory'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounting'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['finance'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pos', 'sales'] })
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['pos', 'sessions'] })
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['pos', 'z-reports'] })
}

describe('commercial POS invoice mutation invalidation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates commercial and POS sale data without report reconstruction after correction', async () => {
    mocks.updateActiveInvoice.mockResolvedValue({ id: 'invoice-1', posContext: {} })
    const { result, invalidate } = setup(() => useUpdateActiveSalesInvoice('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({} as never)
    })

    expectCommercialInvalidation(invalidate)
  })

  it('invalidates commercial and POS sale data without report reconstruction after deletion', async () => {
    mocks.deleteActiveInvoice.mockResolvedValue(undefined)
    const { result, invalidate } = setup(() => useDeleteActiveSalesInvoice('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({
        reason: 'Delete duplicate sale',
        expectedUpdatedAtUtc: '2026-10-01T10:00:00Z',
      })
    })

    expectCommercialInvalidation(invalidate)
  })
})
