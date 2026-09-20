const POS_MONEY_SCALE = 10_000

/**
 * Mirrors the backend POS Money(decimal) rule: four decimal places with midpoint
 * rounding away from zero. The backend remains authoritative; this keeps the
 * cashier preview from disagreeing with posting because of JS floating point.
 */
export function roundPosMoney(value: number): number {
  if (!Number.isFinite(value)) return value

  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) * POS_MONEY_SCALE
  const tolerance = Number.EPSILON * Math.max(1, scaled) * 4
  const rounded = sign * Math.floor(scaled + 0.5 + tolerance) / POS_MONEY_SCALE

  return rounded === 0 ? 0 : rounded
}

export function posLineAmount(unitPrice: number, quantity: number): number {
  return roundPosMoney(unitPrice * quantity)
}

export function posTenderBaseAmount(amount: number, exchangeRate: number): number {
  return roundPosMoney(amount * exchangeRate)
}

export function posTenderedBaseTotal(
  tenders: Array<{ amount: number; exchangeRate: number }>
): number {
  return roundPosMoney(
    tenders.reduce(
      (sum, tender) => sum + posTenderBaseAmount(tender.amount, tender.exchangeRate),
      0
    )
  )
}
