export function formatMoney(
  value: number,
  symbol: string,
  decimalPlaces: number,
): string {
  const amount = value.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })

  return symbol ? `${symbol} ${amount}` : amount
}
