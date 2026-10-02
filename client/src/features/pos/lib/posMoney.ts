const POS_MONEY_SCALE = 10_000

/**
 * Mirrors the backend POS Money(decimal) rule: four decimal places with midpoint
 * rounding away from zero. The backend remains authoritative; this keeps the
 * operator preview from disagreeing with posting because of JS floating point.
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

export function posMoneyLineBaseAmount(amount: number, exchangeRate: number): number {
  return roundPosMoney(amount * exchangeRate)
}

export function posCollectionBaseTotal(
  collections: Array<{ amount: number; exchangeRate: number }>
): number {
  return roundPosMoney(
    collections.reduce(
      (sum, collection) => sum + posMoneyLineBaseAmount(collection.amount, collection.exchangeRate),
      0
    )
  )
}
