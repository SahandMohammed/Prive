import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Play, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { useCurrentUser } from '@/features/auth'
import {
  useActivePosSession,
  useCreatePosRegister,
  usePosRegisters,
  usePosSessions,
  usePosZReports,
  useUpdatePosRegister,
} from '../hooks/usePos'
import { posRegisterSchema } from '../schemas/pos.schema'
import type { PosRegisterValues } from '../schemas/pos.schema'
import { PosSessionStatus } from '../types/pos.types'

export function PosSessionsPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const [status, setStatus] = useState<'' | PosSessionStatus>('')
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionPageSize, setSessionPageSize] = useState(20)
  const [reportPage, setReportPage] = useState(1)
  const [reportPageSize, setReportPageSize] = useState(20)
  const activeSession = useActivePosSession()
  const registers = usePosRegisters(true)
  const sessions = usePosSessions({ page: sessionPage, pageSize: sessionPageSize, status: status === '' ? undefined : status })
  const reports = usePosZReports({ page: reportPage, pageSize: reportPageSize })
  const createRegister = useCreatePosRegister()
  const updateRegister = useUpdatePosRegister()
  const canManageRegisters = user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Manager'
  const registerForm = useForm<PosRegisterValues>({
    resolver: zodResolver(posRegisterSchema),
    defaultValues: { code: '', name: '' },
  })

  const create = registerForm.handleSubmit((values) => {
    createRegister.mutate(values, {
      onSuccess: () => registerForm.reset(),
    })
  })

  const enterWorkspace = () => {
    const workspace = window.open('/pos/workspace', '_blank')
    if (workspace) {
      // Opening from this tab preserves the current sessionStorage branch selection.
      // Drop the opener reference after creation so the POS tab cannot control the ERP tab.
      workspace.opener = null
      return
    }
    navigate('/pos/workspace')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Point of Sale</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your own POS session, continue an open session, or review branch session history.
            </p>
            {activeSession.data && (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Your current session is {activeSession.data.sessionNumber} on {activeSession.data.registerCode}.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={enterWorkspace}
              disabled={activeSession.isPending || activeSession.isError}
            >
              {activeSession.data ? <Play className="size-4" /> : <Plus className="size-4" />}
              {activeSession.isPending
                ? 'Checking Session…'
                : activeSession.data
                  ? 'Continue Session'
                  : 'Create New Session'}
            </Button>
          </div>
        </header>

        {activeSession.isError && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {activeSession.error.message}
          </p>
        )}

        <section aria-label="Session history" className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Sessions</h2>
              <p className="text-sm text-muted-foreground">
                Cashiers see their own sessions. Managers and owners can monitor sessions for the selected branch.
              </p>
            </div>
            <select
              value={status}
              aria-label="Session status"
              onChange={(event) => {
                const value = event.target.value
                setStatus(value === String(PosSessionStatus.Open) ? PosSessionStatus.Open
                  : value === String(PosSessionStatus.Closed) ? PosSessionStatus.Closed : '')
                setSessionPage(1)
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value={PosSessionStatus.Open}>Open</option>
              <option value={PosSessionStatus.Closed}>Closed</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2">Session</th>
                  <th>Register</th>
                  <th>Cashier</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Status</th>
                  <th>Sales</th>
                  <th>Gross</th>
                  <th>Variance</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(sessions.data?.data ?? []).map((row) => {
                  const isCurrentSession = row.status === PosSessionStatus.Open && row.id === activeSession.data?.id
                  return (
                    <tr key={row.id}>
                      <td className="py-3 font-mono font-medium">{row.sessionNumber}</td>
                      <td>{row.registerCode} — {row.registerName}</td>
                      <td>{row.cashierUsername}</td>
                      <td>{dateTime(row.openedAtUtc)}</td>
                      <td>{row.closedAtUtc ? dateTime(row.closedAtUtc) : '—'}</td>
                      <td>
                        <span className={row.status === PosSessionStatus.Open
                          ? 'inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                          : 'inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'}
                        >
                          {row.status === PosSessionStatus.Open ? 'Open' : 'Closed'}
                          {isCurrentSession ? ' · Yours' : ''}
                        </span>
                      </td>
                      <td>{row.saleCount}</td>
                      <td>{money(row.grossSalesBase)} {row.baseCurrencyCode}</td>
                      <td>{signed(row.varianceBase)} {row.baseCurrencyCode}</td>
                      <td className="text-right">
                        {isCurrentSession ? (
                          <Button size="sm" variant="outline" onClick={enterWorkspace}>
                            <Play className="size-3.5" /> Continue
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {sessions.isPending && <p className="py-4 text-sm text-muted-foreground">Loading sessions…</p>}
          {sessions.isError && <p role="alert" className="py-4 text-sm text-destructive">{sessions.error.message}</p>}
          {sessions.data?.data.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No sessions found. Use Create New Session to start the first session available to you.
            </p>
          )}
          {sessions.data && (
            <DataTablePagination
              page={sessionPage}
              pageSize={sessionPageSize}
              totalItems={sessions.data.meta.totalCount}
              onPageChange={setSessionPage}
              onPageSizeChange={(size) => { setSessionPageSize(size); setSessionPage(1) }}
            />
          )}
        </section>

        {canManageRegisters && (
          <section aria-label="POS registers" className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Registers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One register may have only one open session at a time. Registers in use cannot be deactivated.
            </p>
            <form className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]" onSubmit={create}>
              <div>
                <Input {...registerForm.register('code')} placeholder="Code · RECEPTION" maxLength={32} />
                {registerForm.formState.errors.code?.message && (
                  <p className="mt-1 text-xs text-destructive">{registerForm.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <Input {...registerForm.register('name')} placeholder="Register name · Reception POS" maxLength={120} />
                {registerForm.formState.errors.name?.message && (
                  <p className="mt-1 text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <Button type="submit" disabled={createRegister.isPending}>
                <Plus className="size-4" /> Add Register
              </Button>
            </form>
            {(createRegister.error || updateRegister.error) && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {createRegister.error?.message ?? updateRegister.error?.message}
              </p>
            )}
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {(registers.data ?? []).map((register) => (
                <div key={register.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{register.code} — {register.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {register.isActive
                        ? register.hasOpenSession ? 'Active · In use' : 'Active · Available'
                        : 'Inactive'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    title={register.hasOpenSession ? 'Close the open session before deactivating this register.' : undefined}
                    disabled={updateRegister.isPending || register.hasOpenSession}
                    onClick={() => updateRegister.mutate({
                      id: register.id,
                      body: { code: register.code, name: register.name, isActive: !register.isActive },
                    })}
                  >
                    {register.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))}
              {registers.isPending && <p className="text-sm text-muted-foreground">Loading registers…</p>}
              {registers.isError && <p role="alert" className="text-sm text-destructive">{registers.error.message}</p>}
              {registers.data?.length === 0 && <p className="text-sm text-muted-foreground">No registers configured.</p>}
            </div>
          </section>
        )}

        <section aria-label="Z reports" className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Z Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Closed-session snapshots are view-only and printable.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {(reports.data?.data ?? []).map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => navigate(`/pos/z-reports/${report.id}`)}
                className="rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono font-semibold">{report.reportNumber}</span>
                  <span className="text-xs text-muted-foreground">{dateTime(report.closedAtUtc)}</span>
                </div>
                <p className="mt-1 text-sm">{report.registerCode} · {report.cashierUsername}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {report.saleCount} sales · {money(report.grossSalesBase)} {report.baseCurrencyCode} · variance {signed(report.varianceBase)} {report.baseCurrencyCode}
                </p>
              </button>
            ))}
            {reports.isPending && <p className="text-sm text-muted-foreground">Loading Z Reports…</p>}
            {reports.isError && <p role="alert" className="text-sm text-destructive">{reports.error.message}</p>}
            {reports.data?.data.length === 0 && <p className="text-sm text-muted-foreground">No Z Reports yet.</p>}
          </div>
          {reports.data && (
            <DataTablePagination
              page={reportPage}
              pageSize={reportPageSize}
              totalItems={reports.data.meta.totalCount}
              onPageChange={setReportPage}
              onPageSizeChange={(size) => { setReportPageSize(size); setReportPage(1) }}
            />
          )}
        </section>
    </div>
  )
}

const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const dateTime = (value: string) => new Date(value).toLocaleString()
