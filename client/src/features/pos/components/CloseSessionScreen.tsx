import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClosePosSession, usePosXReport } from '../hooks/usePos'
import { posCloseSessionSchema } from '../schemas/pos.schema'
import type { PosCloseSessionValues } from '../schemas/pos.schema'
import type { PosSession, PosXReport, PosZReport } from '../types/pos.types'

export function CloseSessionScreen({
  session,
  onCancel,
  onClosed,
}: {
  session: PosSession
  onCancel: () => void
  onClosed: (report: PosZReport) => void
}) {
  const reportQuery = usePosXReport(session.id)

  if (reportQuery.isPending) {
    return <State text="Preparing session reconciliation…" />
  }
  if (reportQuery.isError || !reportQuery.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/20 p-6">
        <div className="max-w-md text-center">
          <p className="font-semibold text-destructive">Unable to prepare session close.</p>
          <p className="mt-2 text-sm text-muted-foreground">{reportQuery.error?.message}</p>
          <Button className="mt-4" variant="outline" onClick={onCancel}>Back to POS</Button>
        </div>
      </div>
    )
  }

  return (
    <CloseSessionForm
      session={session}
      report={reportQuery.data}
      onCancel={onCancel}
      onClosed={onClosed}
    />
  )
}

function CloseSessionForm({
  session,
  report,
  onCancel,
  onClosed,
}: {
  session: PosSession
  report: PosXReport
  onCancel: () => void
  onClosed: (report: PosZReport) => void
}) {
  const closeSession = useClosePosSession()
  const form = useForm<PosCloseSessionValues>({
    resolver: zodResolver(posCloseSessionSchema),
    defaultValues: {
      closingCounts: report.drawers.map((drawer) => ({
        currencyId: drawer.currencyId,
        countedAmount: drawer.expectedAmount,
      })),
      notes: '',
    },
  })
  const counts = form.watch('closingCounts')
  const rows = report.drawers.map((drawer, index) => {
    const counted = Number(counts[index]?.countedAmount) || 0
    return { ...drawer, counted, variance: round4(counted - drawer.expectedAmount) }
  })

  const submit = form.handleSubmit((values) => {
    closeSession.mutate(
      {
        id: session.id,
        body: {
          closingCounts: values.closingCounts,
          notes: values.notes.trim() || null,
        },
      },
      { onSuccess: onClosed }
    )
  })

  return (
    <form className="min-h-screen bg-muted/20 p-4 sm:p-6" onSubmit={submit}>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-5" />
              <h1 className="text-xl font-semibold tracking-tight">Close POS Session</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.sessionNumber} · {session.registerCode} — {session.registerName} · {session.cashierUsername}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onCancel} disabled={closeSession.isPending}>
            <ArrowLeft className="size-4" /> Back to POS
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Sales" value={String(report.saleCount)} />
          <Metric label="Service Sales" value={`${money(report.serviceSalesBase)} ${report.baseCurrencyCode}`} />
          <Metric label="Gross Sales" value={`${money(report.grossSalesBase)} ${report.baseCurrencyCode}`} strong />
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Physical drawer reconciliation</h2>
            <p className="text-sm text-muted-foreground">
              Count each physical currency. Variance is counted minus expected and does not create accounting entries automatically.
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              This session has no physical Cashbox currencies to count. Bank/payment activity is still preserved in the Z Report.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={row.currencyId} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[100px_repeat(3,minmax(0,1fr))] md:items-center">
                  <div className="font-mono text-base font-bold">{row.currencyCode}</div>
                  <Value label="Expected" value={money(row.expectedAmount)} />
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Counted
                    <input type="hidden" {...form.register(`closingCounts.${index}.currencyId`)} />
                    <Input
                      aria-label={`${row.currencyCode} counted amount`}
                      className="font-mono text-sm text-foreground"
                      type="number"
                      min="0"
                      step="0.0001"
                      {...form.register(`closingCounts.${index}.countedAmount`, { valueAsNumber: true })}
                    />
                    {form.formState.errors.closingCounts?.[index]?.countedAmount?.message && (
                      <span className="normal-case tracking-normal text-destructive">
                        {form.formState.errors.closingCounts[index]?.countedAmount?.message}
                      </span>
                    )}
                  </label>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Variance</p>
                    <p className={`mt-1 font-mono text-base font-bold ${row.variance < 0 ? 'text-destructive' : row.variance > 0 ? 'text-amber-600' : ''}`}>
                      {signed(row.variance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Session notes</h2>
          <textarea
            {...form.register('notes')}
            rows={3}
            maxLength={500}
            placeholder="Optional closing note"
            className="mt-3 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {form.formState.errors.notes?.message && (
            <p className="mt-1 text-xs text-destructive">{form.formState.errors.notes.message}</p>
          )}
        </section>

        {closeSession.error && (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{closeSession.error.message}</p>
        )}

        <div className="flex flex-col-reverse gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Closing is final. The session and generated Z Report become historical records.
          </p>
          <Button type="submit" className="sm:min-w-52" disabled={closeSession.isPending}>
            {closeSession.isPending ? 'Closing session…' : 'Close & Generate Z Report'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function State({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center bg-muted/20 text-sm text-muted-foreground">{text}</div>
}
function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 ${strong ? 'text-xl font-bold' : 'font-semibold'}`}>{value}</p></div>
}
function Value({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-mono font-semibold">{value}</p></div>
}
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000
