import { roundPosMoney } from './posMoney'

export interface RefundPreviewLine {
  salesInvoiceLineId: string
  refundableQuantity: number
  refundableAmountBase: number
}

export interface RefundPreviewSelection {
  salesInvoiceLineId: string
  selected: boolean
  quantity: number
}

export function posRefundPreview(
  lines: RefundPreviewLine[],
  selections: RefundPreviewSelection[],
  currentOutstandingBase: number
) {
  const byId = new Map(lines.map((line) => [line.salesInvoiceLineId, line]))
  let quantitiesValid = true
  const selectedTotal = roundPosMoney(selections.reduce((sum, selection) => {
    if (!selection.selected) return sum
    const line = byId.get(selection.salesInvoiceLineId)
    if (!line || selection.quantity <= 0 || selection.quantity > line.refundableQuantity) {
      quantitiesValid = false
      return sum
    }
    return sum + (selection.quantity === line.refundableQuantity
      ? line.refundableAmountBase
      : roundPosMoney(line.refundableAmountBase * selection.quantity / line.refundableQuantity))
  }, 0))
  const receivableReductionBase = roundPosMoney(Math.min(selectedTotal, currentOutstandingBase))
  return {
    quantitiesValid,
    selectedTotalBase: selectedTotal,
    receivableReductionBase,
    physicalRefundBase: roundPosMoney(selectedTotal - receivableReductionBase),
  }
}
