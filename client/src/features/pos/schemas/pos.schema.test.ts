import { describe, expect, it } from 'vitest'
import { posCheckoutSchema, posRefundSchema } from './pos.schema'
import { PosPaymentMode, PosRefundReason } from '../types/pos.types'

const cashboxId = '11111111-1111-4111-8111-111111111111'
const tender = { moneyAccountId: cashboxId, amount: 10_000 }

describe('posCheckoutSchema', () => {
  it('requires a Cashbox and received amount for a paid checkout', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Paid,
      moneyAccountId: '',
      receivedAmount: 0,
      changeMoneyAccountId: '',
    })

    expect(result.success).toBe(false)
  })

  it('accepts an unpaid checkout without Cashbox details', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Credit,
      moneyAccountId: '',
      receivedAmount: 0,
      changeMoneyAccountId: '',
    })

    expect(result.success).toBe(true)
  })

  it('does not expose Partial as a cashier checkout mode', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Partial,
      moneyAccountId: cashboxId,
      receivedAmount: 1,
      changeMoneyAccountId: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('posRefundSchema', () => {
  const line = {
    salesInvoiceLineId: '22222222-2222-4222-8222-222222222222',
    selected: true,
    quantity: 1,
    restockProduct: false,
  }

  it('requires a selected positive refund line', () => {
    expect(posRefundSchema.safeParse({
      reason: PosRefundReason.CustomerComplaint,
      notes: '',
      lines: [{ ...line, selected: false, quantity: 0 }],
      refundTenders: [],
    }).success).toBe(false)
  })

  it('requires notes for Other and accepts audited notes', () => {
    const input = {
      reason: PosRefundReason.Other,
      notes: '',
      lines: [line],
      refundTenders: [],
    }
    expect(posRefundSchema.safeParse(input).success).toBe(false)
    expect(posRefundSchema.safeParse({ ...input, notes: 'Approved exception' }).success).toBe(true)
  })

  it('accepts multiple physical refund accounts', () => {
    expect(posRefundSchema.safeParse({
      reason: PosRefundReason.ProductReturned,
      notes: 'Product inspected',
      lines: [{ ...line, restockProduct: true }],
      refundTenders: [tender, { ...tender, moneyAccountId: '33333333-3333-4333-8333-333333333333' }],
    }).success).toBe(true)
  })
})
