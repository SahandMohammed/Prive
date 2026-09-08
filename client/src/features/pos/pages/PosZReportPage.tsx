import { useEffect, useRef } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePosZReport } from '../hooks/usePos'

export function PosZReportPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = usePosZReport(id)
  const printed = useRef(false)

  useEffect(() => {
    if (!query.data || searchParams.get('print') !== '1' || printed.current) return
    printed.current = true
    const timer = window.setTimeout(() => window.print(), 120)
    return () => window.clearTimeout(timer)
  }, [query.data, searchParams])

  if (query.isPending) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading Z Report…</div>
  }
  if (query.isError || !query.data) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div><p className="font-semibold text-destructive">Z Report unavailable.</p><p className="mt-2 text-sm text-muted-foreground">{query.error?.message}</p></div>
      </div>
    )
  }
  const report = query.data
  const varianceBase = report.drawers.reduce((sum, row) => sum + (row.varianceBaseAmount ?? 0), 0)

  return (
    <div className="min-h-screen bg-muted/20 p-4 print:bg-white print:p-0 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-card p-5 shadow-sm print:max-w-none print:border-0 print:shadow-none sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => navigate('/pos')}><ArrowLeft className="size-4" /> Back to POS</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
        </div>

        <header className="border-b pb-5 text-center">
          <p className="text-xl font-semibold tracking-[0.25em]">PRIVÉ</p>
          <h1 className="mt-2 text-2xl font-bold">Z REPORT</h1>
          <p className="mt-1 font-mono text-sm">{report.reportNumber}</p>
        </header>

        <section className="grid gap-x-6 gap-y-3 border-b py-5 sm:grid-cols-2">
          <Info label="Session" value={report.sessionNumber} />
          <Info label="Branch" value={`${report.branchCode} — ${report.branchName}`} />
          <Info label="Register" value={`${report.registerCode} — ${report.registerName}`} />
          <Info label="Cashier" value={report.cashierUsername} />
          <Info label="Opened" value={dateTime(report.openedAtUtc)} />
          <Info label="Closed" value={dateTime(report.closedAtUtc)} />
          <Info label="Closed by" value={report.closedByUsername} />
          <Info label="Generated" value={dateTime(report.generatedAtUtc)} />
        </section>

        <Section title="Sales">
          <SummaryLine label="Service Sales" value={`${money(report.serviceSalesBase)} ${report.baseCurrencyCode}`} />
          <SummaryLine label="Product Sales" value={`${money(report.productSalesBase)} ${report.baseCurrencyCode}`} />
          <SummaryLine label="Gross Sales" value={`${money(report.grossSalesBase)} ${report.baseCurrencyCode}`} strong />
          <SummaryLine label="Completed POS Sales" value={String(report.saleCount)} />
        </Section>

        <Section title="Payments">
          {report.payments.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[650px] border-collapse text-sm print:min-w-0">
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Account</th><th>Currency</th><th>Tendered</th><th>Change</th><th>Net</th><th>Base Net</th></tr></thead>
                <tbody>{report.payments.map((row) => (
                  <tr key={row.moneyAccountId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.moneyAccountCode} — {row.moneyAccountName}</td>
                    <td>{row.currencyCode}</td><td>{money(row.tenderedAmount)}</td><td>{money(row.changeAmount)}</td><td>{money(row.netAmount)}</td><td>{money(row.netBaseAmount)} {report.baseCurrencyCode}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Drawer Reconciliation">
          {report.drawers.length === 0 ? <Empty text="No physical Cashbox currency was associated with this session." /> : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[720px] border-collapse text-sm print:min-w-0">
                <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="py-2">Currency</th><th>Opening</th><th>Received</th><th>Change</th><th>Expected</th><th>Counted</th><th>Variance</th></tr></thead>
                <tbody>{report.drawers.map((row) => (
                  <tr key={row.currencyId} className="border-b last:border-0">
                    <td className="py-2 font-mono font-semibold">{row.currencyCode}</td>
                    <td>{money(row.openingAmount)}</td><td>{money(row.tenderedAmount)}</td><td>{money(row.changeAmount)}</td><td>{money(row.expectedAmount)}</td><td>{money(row.countedAmount ?? 0)}</td>
                    <td className={(row.varianceAmount ?? 0) < 0 ? 'text-destructive print:text-black' : ''}>{signed(row.varianceAmount ?? 0)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex justify-between border-t pt-3 text-sm font-semibold"><span>Total variance in base currency</span><span>{signed(varianceBase)} {report.baseCurrencyCode}</span></div>
        </Section>

        <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          Immutable POS session closing snapshot · {report.reportNumber}
        </footer>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border-b py-5 last:border-0"><h2 className="mb-3 text-sm font-bold uppercase tracking-wide">{title}</h2>{children}</section> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div> }
function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'border-t pt-3 font-bold' : ''}`}><span>{label}</span><span className="font-mono">{value}</span></div> }
function Empty({ text = 'No activity.' }: { text?: string }) { return <p className="text-sm text-muted-foreground">{text}</p> }
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const dateTime = (value: string) => new Date(value).toLocaleString()
