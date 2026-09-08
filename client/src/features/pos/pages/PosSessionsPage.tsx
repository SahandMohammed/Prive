import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@/features/auth'
import {
  useCreatePosRegister,
  usePosRegisters,
  usePosSessions,
  usePosZReports,
  useUpdatePosRegister,
} from '../hooks/usePos'
import { PosSessionStatus } from '../types/pos.types'

export function PosSessionsPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const [status, setStatus] = useState<'' | number>('')
  const registers = usePosRegisters(true)
  const sessions = usePosSessions({ page: 1, pageSize: 50, status: status === '' ? undefined : status })
  const reports = usePosZReports({ page: 1, pageSize: 50 })
  const createRegister = useCreatePosRegister()
  const updateRegister = useUpdatePosRegister()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const canManageRegisters = user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Manager'

  const create = () => {
    if (!code.trim() || !name.trim()) return
    createRegister.mutate({ code: code.trim(), name: name.trim() }, {
      onSuccess: () => { setCode(''); setName('') },
    })
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">POS Sessions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Registers, session history, and immutable Z Reports for the selected branch.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/pos')}><ArrowLeft className="size-4" /> Back to POS</Button>
        </header>

        {canManageRegisters && (
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Registers</h2>
            <p className="mt-1 text-sm text-muted-foreground">One register may have only one open session at a time.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
              <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code · RECEPTION" maxLength={32} />
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Register name · Reception POS" maxLength={120} />
              <Button disabled={!code.trim() || !name.trim() || createRegister.isPending} onClick={create}>
                <Plus className="size-4" /> Add Register
              </Button>
            </div>
            {(createRegister.error || updateRegister.error) && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{createRegister.error?.message ?? updateRegister.error?.message}</p>
            )}
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {(registers.data ?? []).map((register) => (
                <div key={register.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0"><p className="truncate font-medium">{register.code} — {register.name}</p><p className="text-xs text-muted-foreground">{register.isActive ? 'Active' : 'Inactive'}</p></div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateRegister.isPending}
                    onClick={() => updateRegister.mutate({ id: register.id, body: { code: register.code, name: register.name, isActive: !register.isActive } })}
                  >
                    {register.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))}
              {registers.data?.length === 0 && <p className="text-sm text-muted-foreground">No registers configured.</p>}
            </div>
          </section>
        )}

        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Session History</h2><p className="text-sm text-muted-foreground">Cashiers see their own sessions; management can see the selected branch.</p></div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value === '' ? '' : Number(event.target.value))}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value={PosSessionStatus.Open}>Open</option>
              <option value={PosSessionStatus.Closed}>Closed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-2">Session</th><th>Register</th><th>Cashier</th><th>Opened</th><th>Closed</th><th>Status</th><th>Sales</th><th>Gross</th><th>Variance</th></tr></thead>
              <tbody className="divide-y">
                {(sessions.data?.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 font-mono font-medium">{row.sessionNumber}</td>
                    <td>{row.registerCode} — {row.registerName}</td><td>{row.cashierUsername}</td><td>{dateTime(row.openedAtUtc)}</td><td>{row.closedAtUtc ? dateTime(row.closedAtUtc) : '—'}</td>
                    <td>{row.status === PosSessionStatus.Open ? 'Open' : 'Closed'}</td><td>{row.saleCount}</td><td>{money(row.grossSalesBase)} {row.baseCurrencyCode}</td><td>{signed(row.varianceBase)} {row.baseCurrencyCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sessions.isPending && <p className="py-4 text-sm text-muted-foreground">Loading sessions…</p>}
          {sessions.isError && <p className="py-4 text-sm text-destructive">{sessions.error.message}</p>}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Z Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Closed-session snapshots are view-only and printable.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {(reports.data?.data ?? []).map((report) => (
              <button key={report.id} type="button" onClick={() => navigate(`/pos/z-reports/${report.id}`)} className="rounded-xl border p-4 text-left transition-colors hover:bg-muted/50">
                <div className="flex items-center justify-between gap-3"><span className="font-mono font-semibold">{report.reportNumber}</span><span className="text-xs text-muted-foreground">{dateTime(report.closedAtUtc)}</span></div>
                <p className="mt-1 text-sm">{report.registerCode} · {report.cashierUsername}</p>
                <p className="mt-2 text-xs text-muted-foreground">{report.saleCount} sales · {money(report.grossSalesBase)} {report.baseCurrencyCode} · variance {signed(report.varianceBase)} {report.baseCurrencyCode}</p>
              </button>
            ))}
            {reports.data?.data.length === 0 && <p className="text-sm text-muted-foreground">No Z Reports yet.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const dateTime = (value: string) => new Date(value).toLocaleString()
