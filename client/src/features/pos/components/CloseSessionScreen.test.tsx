import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from '@/features/auth'
import { useClosePosSession, usePosXReport } from '../hooks/usePos'
import { PosSessionStatus } from '../types/pos.types'
import type { PosSession, PosXReport, PosZReport } from '../types/pos.types'
import { CloseSessionScreen } from './CloseSessionScreen'

vi.mock('@/features/auth', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../hooks/usePos', () => ({ useClosePosSession: vi.fn(), usePosXReport: vi.fn() }))

const currencyId = '11111111-1111-4111-8111-111111111111'
const cashierId = '22222222-2222-4222-8222-222222222222'
const managerId = '33333333-3333-4333-8333-333333333333'

const session: PosSession = {
  id: '44444444-4444-4444-8444-444444444444',
  sessionNumber: 'PSS-000001',
  branchId: '55555555-5555-4555-8555-555555555555',
  branchCode: 'MAIN',
  branchName: 'Main',
  registerId: '66666666-6666-4666-8666-666666666666',
  registerCode: 'RECEPTION',
  registerName: 'Reception',
  cashierUserId: cashierId,
  cashierUsername: 'cashier',
  status: PosSessionStatus.Open,
  openedAtUtc: '2026-09-23T08:00:00Z',
  closedAtUtc: null,
  closedByUserId: null,
  closedByUsername: null,
  openingNotes: null,
  closingNotes: null,
  openingCounts: [],
}

const report = {
  session,
  generatedAtUtc: '2026-09-23T10:00:00Z',
  saleCount: 1,
  serviceSalesBase: 25_000,
  productSalesBase: 0,
  grossSalesBase: 25_000,
  refundCount: 0,
  serviceRefundsBase: 0,
  productRefundsBase: 0,
  refundTotalBase: 0,
  netSalesBase: 25_000,
  baseCurrencyId: currencyId,
  baseCurrencyCode: 'IQD',
  payments: [],
  drawers: [{
    currencyId,
    currencyCode: 'IQD',
    openingAmount: 0,
    tenderedAmount: 25_000,
    changeAmount: 0,
    refundAmount: 0,
    expectedAmount: 25_000,
    countedAmount: null,
    varianceAmount: null,
    openingBaseAmount: 0,
    tenderedBaseAmount: 25_000,
    changeBaseAmount: 0,
    refundBaseAmount: 0,
    expectedBaseAmount: 25_000,
    countedBaseAmount: null,
    varianceBaseAmount: null,
    cashInAmount: 0,
    cashOutAmount: 0,
    cashDropAmount: 0,
    adjustmentAmount: 0,
    cashInBaseAmount: 0,
    cashOutBaseAmount: 0,
    cashDropBaseAmount: 0,
    adjustmentBaseAmount: 0,
    closingExchangeRate: null,
  }],
} as PosXReport

let mutate: ReturnType<typeof vi.fn>

beforeEach(() => {
  mutate = vi.fn((_input, options: { onSuccess: (value: PosZReport) => void }) => options.onSuccess({ id: 'report-id' } as PosZReport))
  vi.mocked(usePosXReport).mockReturnValue({ isPending: false, isError: false, data: report, error: null } as never)
  vi.mocked(useClosePosSession).mockReturnValue({ mutate, isPending: false, error: null } as never)
})

afterEach(() => {
  vi.resetAllMocks()
  cleanup()
})

function mount(currentUserId: string) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: { id: currentUserId, username: 'user', role: 'Manager' } } as never)
  render(<CloseSessionScreen session={session} onCancel={vi.fn()} onClosed={vi.fn()} />)
}

describe('CloseSessionScreen', () => {
  it('keeps notes optional when closing the current cashier session', async () => {
    mount(cashierId)

    expect(await screen.findByRole('heading', { name: 'Session notes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Session notes')).not.toHaveAttribute('aria-required', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Close & Generate Z Report' }))

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce())
    expect(mutate.mock.calls[0][0]).toEqual({
      id: session.id,
      body: { closingCounts: [{ currencyId, countedAmount: 25_000 }], notes: null },
    })
  })

  it('requires a reason before closing another cashier session', async () => {
    mount(managerId)

    expect(await screen.findByRole('heading', { name: 'Closing reason' })).toBeInTheDocument()
    expect(screen.getByText('A reason is required because this session belongs to another cashier.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close & Generate Z Report' }))

    expect(await screen.findByText("A closing reason is required for another cashier's session")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('blocks a whitespace-only management reason', async () => {
    mount(managerId)

    fireEvent.change(await screen.findByLabelText('Closing reason'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close & Generate Z Report' }))

    expect(await screen.findByText("A closing reason is required for another cashier's session")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits a trimmed management reason', async () => {
    mount(managerId)

    fireEvent.change(await screen.findByLabelText('Closing reason'), { target: { value: '  Drawer counted by manager  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close & Generate Z Report' }))

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce())
    expect(mutate.mock.calls[0][0]).toEqual({
      id: session.id,
      body: { closingCounts: [{ currencyId, countedAmount: 25_000 }], notes: 'Drawer counted by manager' },
    })
  })
})
