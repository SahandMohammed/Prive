import { describe, expect, it } from 'vitest'
import {
  posLineAmount,
  posTenderBaseAmount,
  posTenderedBaseTotal,
  roundPosMoney,
} from './posMoney'

describe('POS money calculations', () => {
  it('rounds to four decimals with midpoint rounding away from zero', () => {
    expect(roundPosMoney(1.23445)).toBe(1.2345)
    expect(roundPosMoney(-1.23445)).toBe(-1.2345)
  })

  it('rounds each sale line the same way as backend posting', () => {
    expect(posLineAmount(0.33335, 1)).toBe(0.3334)
    expect(roundPosMoney(posLineAmount(0.33335, 1) * 2)).toBe(0.6668)
  })

  it('converts and sums mixed IQD and USD tenders using per-tender rounding', () => {
    expect(posTenderBaseAmount(10, 1_300)).toBe(13_000)
    expect(posTenderedBaseTotal([
      { amount: 10, exchangeRate: 1_300 },
      { amount: 12_000, exchangeRate: 1 },
    ])).toBe(25_000)
  })

  it('normalizes floating-point multiplication before comparing settlement totals', () => {
    expect(posTenderBaseAmount(0.1, 0.2)).toBe(0.02)
  })
})
