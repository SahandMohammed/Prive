export const receiptPrintService = {
  printSale(saleId: string) {
    const popup = window.open(`/pos/sales/${saleId}?print=1`, '_blank')
    if (!popup) throw new Error('Receipt window was blocked by the browser.')
    popup.opener = null
  },
}
