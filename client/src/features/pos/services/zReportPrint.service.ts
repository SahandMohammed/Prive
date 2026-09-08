export const zReportPrintService = {
  print(reportId: string) {
    window.open(`/pos/z-reports/${reportId}?print=1`, '_blank', 'noopener,noreferrer')
  },
}
