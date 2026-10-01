import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeleteActiveSalesInvoice, useUpdateActiveSalesInvoice } from './useSales'

const mocks = vi.hoisted(() => ({
  updateActiveInvoice: vi.fn(),
  deleteActiveInvoice: vi.fn(),
}))

vi.mock('@/features/pos', () => ({
  POS_Z_REPORTS_KEY: ['pos', 'z-reports'],
  POS_Z_REPORT_KEY: ['pos', 'z-report'],
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

function expectZInvalidation(invalidate: ReturnType<typeof vi.spyOn>) {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pos', 'z-reports'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pos', 'z-report'] })
}

describe('commercial POS invoice mutation invalidation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates Z-report lists and details after correction', async () => {
    mocks.updateActiveInvoice.mockResolvedValue({ id: 'invoice-1', posContext: {} })
    const { result, invalidate } = setup(() => useUpdateActiveSalesInvoice('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({} as never)
    })

    expectZInvalidation(invalidate)
  })

  it('invalidates Z-report lists and details after deletion', async () => {
    mocks.deleteActiveInvoice.mockResolvedValue(undefined)
    const { result, invalidate } = setup(() => useDeleteActiveSalesInvoice('invoice-1'))

    await act(async () => {
      await result.current.mutateAsync({
        reason: 'Delete duplicate sale',
        expectedUpdatedAtUtc: '2026-10-01T10:00:00Z',
      })
    })

    expectZInvalidation(invalidate)
  })
})
