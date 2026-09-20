import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePosXReport } from '../hooks/usePos'

export function XReportDialog({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = usePosXReport(sessionId, open)
  const report = query.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>X Report</DialogTitle>
          <DialogDescription>Live session position. Generating this report does not close or mutate the session.</DialogDescription>
        </DialogHeader>

        {query.isPending && <p className="py-8 text-center text-sm text-muted-foreground">Loading X Report…</p>}
        {query.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{query.error.message}</p>}
        {report && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Session" value={report.session.sessionNumber} />
              <Metric label="Register" value={report.session.registerName} />
              <Metric label="Cashier" value={report.session.cashierUsername} />
              <Metric label="Opened" value={formatDateTime(report.session.openedAtUtc)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Metric label="Sales" value={String(report.saleCount)} />
              <Metric label="Gross Sales" value={`${money(report.grossSalesBase)} ${report.baseCurrencyCode}`} strong />
              <Metric label="Refunds" value={`${report.refundCount} · ${money(report.refundTotalBase)} ${report.baseCurrencyCode}`} />
              <Metric label="Net Sales" value={`${money(report.netSalesBase)} ${report.baseCurrencyCode}`} strong />
              <Metric label="Mix" value={`Services ${money(report.serviceSalesBase - report.serviceRefundsBase)} · Products ${money(report.productSalesBase - report.productRefundsBase)}`} />
            </div>

            <Section title="Payments">
              {report.payments.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr><th className="pb-2">Account</th><th>Currency</th><th>Tendered</th><th>Change</th><th>Refunds</th><th>Net</th><th>Base net</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.payments.map((row) => (
                        <tr key={row.moneyAccountId}>
                          <td className="py-2 font-medium">{row.moneyAccountCode} — {row.moneyAccountName}</td>
                          <td>{row.currencyCode}</td>
                          <td>{money(row.tenderedAmount)}</td>
                          <td>{money(row.changeAmount)}</td>
                          <td>{money(row.refundAmount)}</td>
                          <td>{money(row.netAmount)}</td>
                          <td>{money(row.netBaseAmount)} {report.baseCurrencyCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Expected Drawer">
              {report.drawers.length === 0 ? <Empty text="No physical Cashbox currencies are part of this session." /> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.drawers.map((row) => (
                    <div key={row.currencyId} className="rounded-xl border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono font-semibold">{row.currencyCode}</span>
                        <span className="text-lg font-bold">{money(row.expectedAmount)}</span>
                      </div>
                      <Line label="Opening" value={money(row.openingAmount)} />
                      <Line label="Cash tender" value={`+${money(row.tenderedAmount)}`} />
                      <Line label="Change" value={`-${money(row.changeAmount)}`} />
                      <Line label="Refunds" value={`-${money(row.refundAmount)}`} />
                      <Line label="Expected base" value={`${money(row.expectedBaseAmount)} ${report.baseCurrencyCode}`} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <p className="text-xs text-muted-foreground">Generated {formatDateTime(report.generatedAtUtc)}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">{title}</h3>{children}</section>
}
function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 ${strong ? 'text-lg font-bold' : 'text-sm font-semibold'}`}>{value}</p></div>
}
function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value}</span></div>
}
function Empty({ text = 'No activity yet.' }: { text?: string }) { return <p className="text-sm text-muted-foreground">{text}</p> }
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const formatDateTime = (value: string) => new Date(value).toLocaleString()
