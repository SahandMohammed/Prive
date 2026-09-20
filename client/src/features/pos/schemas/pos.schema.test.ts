import { describe, expect, it } from 'vitest'
import { posCheckoutSchema, posRefundSchema } from './pos.schema'
import { PosPaymentMode, PosRefundReason } from '../types/pos.types'

const tender = {
  moneyAccountId: '11111111-1111-4111-8111-111111111111',
  amount: 10_000,
}

describe('posCheckoutSchema', () => {
  it('requires at least one tender for a paid checkout', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Paid,
      tenders: [],
      changeMoneyAccountId: '',
      changeAmount: 0,
    })

    expect(result.success).toBe(false)
  })

  it('accepts one or more tenders for a partial checkout', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Partial,
      tenders: [tender],
      changeMoneyAccountId: '',
      changeAmount: 0,
    })

    expect(result.success).toBe(true)
  })

  it('accepts credit checkout with no tender', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Credit,
      tenders: [],
      changeMoneyAccountId: '',
      changeAmount: 0,
    })

    expect(result.success).toBe(true)
  })

  it('rejects tender or change on a credit checkout', () => {
    const result = posCheckoutSchema.safeParse({
      paymentMode: PosPaymentMode.Credit,
      tenders: [tender],
      changeMoneyAccountId: tender.moneyAccountId,
      changeAmount: 1,
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
