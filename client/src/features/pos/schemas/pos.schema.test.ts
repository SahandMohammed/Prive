import { describe, expect, it } from 'vitest'
import { posCheckoutSchema, posRefundSchema } from './pos.schema'
import { PosPaymentMode, PosRefundReason } from '../types/pos.types'

const accountId = '11111111-1111-4111-8111-111111111111'
const payout = { moneyAccountId: accountId, amount: 10_000 }

describe('posCheckoutSchema', () => {
  it('requires at least one positive collection amount for a paid checkout', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Paid,
      collectionAmounts: { [accountId]: 0 },
    })

    expect(result.success).toBe(false)
  })

  it('accepts a credit checkout without collection details', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Credit,
      collectionAmounts: {},
    })

    expect(result.success).toBe(true)
  })

  it('accepts Partial as a checkout mode with a collection', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Partial,
      collectionAmounts: { [accountId]: 1 },
    })

    expect(result.success).toBe(true)
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
      refundPayouts: [],
    }).success).toBe(false)
  })

  it('requires notes for Other and accepts audited notes', () => {
    const input = {
      reason: PosRefundReason.Other,
      notes: '',
      lines: [line],
      refundPayouts: [],
    }
    expect(posRefundSchema.safeParse(input).success).toBe(false)
    expect(posRefundSchema.safeParse({ ...input, notes: 'Approved exception' }).success).toBe(true)
  })

  it('accepts multiple physical refund accounts', () => {
    expect(posRefundSchema.safeParse({
      reason: PosRefundReason.ProductReturned,
      notes: 'Product inspected',
      lines: [{ ...line, restockProduct: true }],
      refundPayouts: [payout, { ...payout, moneyAccountId: '33333333-3333-4333-8333-333333333333' }],
    }).success).toBe(true)
  })
})
