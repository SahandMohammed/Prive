import { describe, expect, it } from 'vitest'
import { posTenderedBaseTotal } from './posMoney'
import { posRefundPreview } from './posRefund'

const lines = [
  { salesInvoiceLineId: 'service', refundableQuantity: 2, refundableAmountBase: 50_000 },
  { salesInvoiceLineId: 'product', refundableQuantity: 1, refundableAmountBase: 20_000 },
]

describe('POS refund preview', () => {
  it('prices selected partial quantities from authoritative refundable values', () => {
    const preview = posRefundPreview(lines, [
      { salesInvoiceLineId: 'service', selected: true, quantity: 1 },
      { salesInvoiceLineId: 'product', selected: false, quantity: 0 },
    ], 0)
    expect(preview).toEqual({
      quantitiesValid: true,
      selectedTotalBase: 25_000,
      receivableReductionBase: 0,
      physicalRefundBase: 25_000,
    })
  })

  it('marks over-selection invalid instead of previewing excess value', () => {
    const preview = posRefundPreview(lines, [
      { salesInvoiceLineId: 'product', selected: true, quantity: 2 },
    ], 0)
    expect(preview.quantitiesValid).toBe(false)
    expect(preview.selectedTotalBase).toBe(0)
  })

  it('reduces outstanding AR first and returns only the remainder physically', () => {
    const preview = posRefundPreview(lines, [
      { salesInvoiceLineId: 'service', selected: true, quantity: 2 },
    ], 30_000)
    expect(preview.receivableReductionBase).toBe(30_000)
    expect(preview.physicalRefundBase).toBe(20_000)
  })

  it('uses the supplied current rates for exact mixed-currency refund math', () => {
    expect(posTenderedBaseTotal([
      { amount: 10, exchangeRate: 1_200 },
      { amount: 13_000, exchangeRate: 1 },
    ])).toBe(25_000)
    expect(posTenderedBaseTotal([{ amount: 10, exchangeRate: 1_300 }])).toBe(13_000)
  })
})
