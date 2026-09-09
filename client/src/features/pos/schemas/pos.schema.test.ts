import { describe, expect, it } from 'vitest'
import { posCheckoutSchema } from './pos.schema'
import { PosPaymentMode } from '../types/pos.types'

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
