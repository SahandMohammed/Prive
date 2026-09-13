import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExchangeRatesPage } from './ExchangeRatesPage'

const state = vi.hoisted(() => ({ role: 'Owner' }))
const actions = vi.hoisted(() => ({
  create: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  deactivate: { mutate: vi.fn(), isPending: false },
}))

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: state.role } }),
}))
vi.mock('@/features/business', () => ({
  useCurrentBusiness: () => ({
    data: {
      baseCurrencyId: '11111111-1111-4111-8111-111111111111',
      baseCurrencyCode: 'IQD',
    },
  }),
  useCurrencies: () => ({
    data: {
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'IQD',
          name: 'Iraqi Dinar',
          symbol: 'IQD',
          isActive: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          isActive: true,
        },
      ],
    },
  }),
}))
vi.mock('../hooks/useFinance', () => ({
  useExchangeRates: () => ({
    data: {
      data: [{
        id: 'rate-1',
        fromCurrencyId: '22222222-2222-4222-8222-222222222222',
        fromCurrencyCode: 'USD',
        toCurrencyId: '11111111-1111-4111-8111-111111111111',
        toCurrencyCode: 'IQD',
        rate: 9_999,
        effectiveAtUtc: '2099-01-01T00:00:00Z',
        isActive: true,
        createdByUserId: 'owner-1',
        createdByUsername: 'owner',
        createdAtUtc: '2026-09-13T00:00:00Z',
      }],
      meta: {
        page: 1,
        pageSize: 200,
        totalCount: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
    isPending: false,
    isError: false,
    error: null,
  }),
  useExchangeRateActions: () => actions,
}))

beforeEach(() => {
  state.role = 'Owner'
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('exchange-rate management', () => {
  it('does not present a future-dated rate as currently effective', () => {
    render(<ExchangeRatesPage />)
    expect(screen.getByText('No active rate set')).toBeInTheDocument()
    expect(screen.getByText(/1 USD =.*9,999\.00.*IQD/)).toBeInTheDocument()
  })

  it('guides an owner to enter USD per IQD direction without a prefilled real rate', async () => {
    render(<ExchangeRatesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Exchange Rate' }))

    expect(await screen.findByText(/For POS USD tender, use USD as From and IQD as To/)).toBeInTheDocument()
    expect(screen.getByText(/Do not enter the inverse rate/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter the business-approved rate')).toHaveValue(0)
  })

  it('does not expose exchange-rate mutations to a cashier', () => {
    state.role = 'Cashier'
    render(<ExchangeRatesPage />)
    expect(screen.queryByRole('button', { name: 'Add Exchange Rate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })
})
