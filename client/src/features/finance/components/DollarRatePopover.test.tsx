import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DollarRatePopover } from './DollarRatePopover'

const state = vi.hoisted(() => ({
  query: {
    data: {
      dollarCurrencyId: 'usd',
      dollarCurrencyCode: 'USD',
      baseCurrencyId: 'iqd',
      baseCurrencyCode: 'IQD',
      rate: 1310 as number | null,
      effectiveAtUtc: new Date().toISOString() as string | null,
      createdByUserId: 'user-1' as string | null,
      createdByUsername: 'cashier' as string | null,
      isBaseCurrency: false,
    },
    isPending: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn().mockResolvedValue(undefined),
  },
  mutation: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}))

vi.mock('../hooks/useFinance', () => ({
  useCurrentDollarRate: () => state.query,
  useSetDollarRate: () => state.mutation,
}))

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: 'Manager' } }),
  hasCapability: () => true,
}))

vi.mock('@/features/business', () => ({
  useCurrentBusiness: () => ({ data: undefined }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { currency?: string }) => ({
      'common.dollarRate': 'Dollar rate',
      'common.dollarRateSetToday': 'Set today’s rate',
      'common.dollarRateUnavailable': 'USD unavailable',
      'common.dollarRateLoading': 'Loading USD rate…',
      'common.dollarRateCurrent': 'Today’s Dollar Rate',
      'common.dollarRateDescription': `Enter the amount of ${options?.currency ?? ''} for 1 USD.`,
      'common.dollarRateInput': 'Rate',
      'common.dollarRateSave': 'Save rate',
      'common.dollarRateViewHistory': 'View full history',
      'common.dollarRateBaseCurrency': 'USD is the business base currency.',
      'common.dollarRateRetry': 'Retry',
    }[key] ?? key),
  }),
}))

function mount() {
  render(<MemoryRouter><DollarRatePopover /></MemoryRouter>)
}

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'Dollar rate' }))
}

beforeEach(() => {
  state.query = {
    data: {
      dollarCurrencyId: 'usd',
      dollarCurrencyCode: 'USD',
      baseCurrencyId: 'iqd',
      baseCurrencyCode: 'IQD',
      rate: 1310,
      effectiveAtUtc: new Date().toISOString(),
      createdByUserId: 'user-1',
      createdByUsername: 'cashier',
      isBaseCurrency: false,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  }
  state.mutation = {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('DollarRatePopover', () => {
  it('shows today’s USD rate and submits a replacement as a new rate record', async () => {
    mount()

    expect(screen.getByText(/1 USD = 1,310\.00 IQD/)).toBeInTheDocument()
    openPopover()

    const input = screen.getByLabelText('Rate')
    await waitFor(() => expect(input).toHaveValue(1310))
    fireEvent.change(input, { target: { value: '1320', valueAsNumber: 1320 } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(state.mutation.mutate).toHaveBeenCalledWith({ rate: 1320 }, expect.any(Object)))
    expect(screen.getByRole('link', { name: 'View full history' })).toHaveAttribute('href', '/finance/exchange-rates')
  })

  it('does not present a previous-day rate as today’s saved rate', () => {
    state.query.data.effectiveAtUtc = '2020-01-01T12:00:00Z'
    mount()

    expect(screen.getByText('Set today’s rate')).toBeInTheDocument()
    openPopover()
    expect(screen.queryByText(/1 USD = 1,310\.00 IQD/)).not.toBeInTheDocument()
  })

  it('renders request failures and allows the query to be retried', () => {
    state.query.isError = true
    state.query.error = new Error('USD is not configured')
    mount()
    openPopover()

    expect(screen.getByRole('alert')).toHaveTextContent('USD is not configured')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(state.query.refetch).toHaveBeenCalledOnce()
  })

  it('does not render an editor when USD is the business base currency', () => {
    state.query.data = {
      ...state.query.data,
      baseCurrencyId: 'usd',
      baseCurrencyCode: 'USD',
      rate: 1,
      effectiveAtUtc: null,
      isBaseCurrency: true,
    }
    mount()
    openPopover()

    expect(screen.getByText('USD is the business base currency.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save rate' })).not.toBeInTheDocument()
  })

  it('changes to the unset state at local midnight', async () => {
    vi.useFakeTimers()
    const beforeMidnight = new Date(2026, 0, 2, 23, 59, 59)
    vi.setSystemTime(beforeMidnight)
    state.query.data.effectiveAtUtc = new Date(2026, 0, 2, 12).toISOString()
    mount()

    expect(screen.getByText(/1 USD = 1,310\.00 IQD/)).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(screen.getByText('Set today’s rate')).toBeInTheDocument()
  })
})
