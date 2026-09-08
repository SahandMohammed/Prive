import { CheckCircle2, LogOut, Printer, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { zReportPrintService } from '../services/zReportPrint.service'
import type { PosZReport } from '../types/pos.types'

export function SessionClosedScreen({
  report,
  onNewSession,
}: {
  report: PosZReport
  onNewSession: () => void
}) {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-screen place-items-center bg-muted/20 p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Session closed successfully</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.sessionNumber} is closed and {report.reportNumber} is now an immutable historical Z Report.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Z Report" value={report.reportNumber} />
          <Metric label="Sales" value={String(report.saleCount)} />
          <Metric label="Gross" value={`${money(report.grossSalesBase)} ${report.baseCurrencyCode}`} />
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => navigate(`/pos/z-reports/${report.id}`)}>
            View Z Report
          </Button>
          <Button variant="outline" onClick={() => zReportPrintService.print(report.id)}>
            <Printer className="size-4" /> Print Z Report
          </Button>
          <Button onClick={onNewSession}>
            <RotateCcw className="size-4" /> Open New Session
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <LogOut className="size-4" /> Exit POS
          </Button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
