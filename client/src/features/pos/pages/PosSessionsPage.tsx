import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeftRight, Loader2, Play, Plus, ReceiptText, Settings2, Store } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranchSelectionStore } from '@/features/business'
import { OpenSessionScreen } from '../components/OpenSessionScreen'
import { DrawerMovementDialog } from '../components/DrawerMovementDialog'
import { PosTransactionsTab } from '../components/PosTransactionsTab'
import {
  useActivePosSession,
  useCreatePosRegister,
  usePosRegisters,
  usePosSessions,
  usePosSetup,
  usePosZReports,
  useUpdatePosRegister,
} from '../hooks/usePos'
import { posRegisterSchema } from '../schemas/pos.schema'
import type { PosRegisterValues } from '../schemas/pos.schema'
import { PosSessionStatus } from '../types/pos.types'
import type { PosSession } from '../types/pos.types'

export function PosSessionsPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const selectedBranchId = useBranchSelectionStore((state) => state.branchId)
  const [status, setStatus] = useState<'' | PosSessionStatus>('')
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionPageSize, setSessionPageSize] = useState(20)
  const [reportPage, setReportPage] = useState(1)
  const [reportPageSize, setReportPageSize] = useState(20)
  const [openSessionDialog, setOpenSessionDialog] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [drawerSessionId, setDrawerSessionId] = useState<string | null>(null)

  const activeSession = useActivePosSession()
  const setup = usePosSetup()
  const registers = usePosRegisters(true)
  const sessions = usePosSessions({
    page: sessionPage,
    pageSize: sessionPageSize,
    status: status === '' ? undefined : status,
  })
  const reports = usePosZReports({ page: reportPage, pageSize: reportPageSize })
  const createRegister = useCreatePosRegister()
  const updateRegister = useUpdatePosRegister()

  const canManageRegisters = hasCapability(user?.role, 'managePos')
  const selectedBranch =
    setup.data?.branches.find((branch) => branch.id === selectedBranchId) ?? setup.data?.branches[0]

  const registerForm = useForm<PosRegisterValues>({
    resolver: zodResolver(posRegisterSchema),
    defaultValues: { code: '', name: '' },
  })

  const closeRegisterDialog = () => {
    setRegisterDialogOpen(false)
    registerForm.reset()
    createRegister.reset()
  }

  const create = registerForm.handleSubmit((values) => {
    createRegister.mutate(values, { onSuccess: closeRegisterDialog })
  })

  const openWorkspace = () => {
    const workspace = window.open('/pos/workspace', '_blank')
    if (workspace) {
      workspace.opener = null
      return
    }
    navigate('/pos/workspace')
  }

  const prepareWorkspaceWindow = () => window.open('', '_blank')

  const completeSessionOpen = (_session: PosSession, workspace: Window | null) => {
    setOpenSessionDialog(false)
    if (workspace) {
      workspace.location.href = '/pos/workspace'
      workspace.opener = null
      return
    }
    navigate('/pos/workspace')
  }

  const sessionPrerequisiteError =
    activeSession.error?.message ?? setup.error?.message ?? registers.error?.message

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Point of Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage cashier sessions, POS registers, and immutable closing reports.
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={activeSession.data ? openWorkspace : () => setOpenSessionDialog(true)}
          disabled={
            activeSession.isPending
            || activeSession.isError
            || (!activeSession.data && (setup.isPending || setup.isError || registers.isPending || registers.isError))
          }
        >
          {activeSession.data ? <Play className="size-4" /> : <Plus className="size-4" />}
          {activeSession.isPending
            ? 'Checking session…'
            : activeSession.data
              ? 'Continue session'
              : 'Create new session'}
        </Button>
      </div>

      {activeSession.data && (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/20">
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Session {activeSession.data.sessionNumber} is open
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
              {activeSession.data.registerCode} — {activeSession.data.registerName}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openWorkspace}>
            <Play className="size-3.5" />
            Open workspace
          </Button>
        </div>
      )}

      {sessionPrerequisiteError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {sessionPrerequisiteError}
        </p>
      )}

      <Tabs defaultValue="sessions" className="gap-5">
        <TabsList variant="line" className="w-full justify-start border-b border-slate-200 dark:border-slate-800">
          <TabsTrigger value="sessions">
            <Store data-icon="inline-start" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {canManageRegisters && (
            <TabsTrigger value="registers">
              <Settings2 data-icon="inline-start" />
              Registers
            </TabsTrigger>
          )}
          <TabsTrigger value="reports">
            <ReceiptText data-icon="inline-start" />
            Z Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <section aria-label="Session history" className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sessions</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cashiers see their own history. Managers and owners can monitor the selected branch.
                </p>
              </div>
              <select
                value={status}
                aria-label="Session status"
                onChange={(event) => {
                  const value = event.target.value
                  setStatus(
                    value === String(PosSessionStatus.Open)
                      ? PosSessionStatus.Open
                      : value === String(PosSessionStatus.Closed)
                        ? PosSessionStatus.Closed
                        : ''
                  )
                  setSessionPage(1)
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="">All statuses</option>
                <option value={PosSessionStatus.Open}>Open</option>
                <option value={PosSessionStatus.Closed}>Closed</option>
              </select>
            </div>

            <DataTableShell>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={head}>
                      <TableHead className="px-4">Session</TableHead>
                      <TableHead className="px-4">Register</TableHead>
                      <TableHead className="px-4">Cashier</TableHead>
                      <TableHead className="px-4">Opened</TableHead>
                      <TableHead className="px-4">Closed</TableHead>
                      <TableHead className="px-4">Status</TableHead>
                      <TableHead className="px-4 text-right">Sales</TableHead>
                      <TableHead className="px-4 text-right">Gross</TableHead>
                      <TableHead className="px-4 text-right">Variance</TableHead>
                      <TableHead className="w-24 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {sessions.isPending && <StateRow colSpan={10} loading message="Loading sessions…" />}
                    {sessions.isError && !sessions.isPending && (
                      <StateRow colSpan={10} error message={sessions.error.message} />
                    )}
                    {!sessions.isPending && !sessions.isError && sessions.data?.data.length === 0 && (
                      <StateRow
                        colSpan={10}
                        message="No sessions found. Create a new session to start selling."
                      />
                    )}
                    {(sessions.data?.data ?? []).map((row) => {
                      const isCurrentSession =
                        row.status === PosSessionStatus.Open && row.id === activeSession.data?.id
                      return (
                        <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          <TableCell className="px-4 py-3.5 font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                            {row.sessionNumber}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{row.registerName}</p>
                            <p className="font-mono text-xs text-slate-500">{row.registerCode}</p>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {row.cashierUsername}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {dateTime(row.openedAtUtc)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {row.closedAtUtc ? dateTime(row.closedAtUtc) : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <StatusBadge open={row.status === PosSessionStatus.Open} current={isCurrentSession} />
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right font-mono">{row.saleCount}</TableCell>
                          <TableCell className="px-4 py-3.5 text-right font-mono">
                            {money(row.grossSalesBase)} {row.baseCurrencyCode}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right font-mono">
                            {signed(row.varianceBase)} {row.baseCurrencyCode}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right">
                            {isCurrentSession ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={openWorkspace}
                                aria-label={`Continue ${row.sessionNumber}`}
                              >
                                <Play className="size-4" />
                              </Button>
                            ) : canManageRegisters && row.status === PosSessionStatus.Open ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDrawerSessionId(row.id)}
                                  aria-label={`Post a drawer movement for ${row.sessionNumber}`}
                                >
                                  <ArrowLeftRight className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/pos/sessions/${row.id}/close`)}
                                  aria-label={`Force close ${row.sessionNumber}`}
                                >
                                  Close
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </DataTableShell>

            {sessions.data && (
              <DataTablePagination
                page={sessionPage}
                pageSize={sessionPageSize}
                totalItems={sessions.data.meta.totalCount}
                onPageChange={setSessionPage}
                onPageSizeChange={(size) => {
                  setSessionPageSize(size)
                  setSessionPage(1)
                }}
              />
            )}
          </section>
        </TabsContent>

        <TabsContent value="transactions"><PosTransactionsTab /></TabsContent>

        {canManageRegisters && (
          <TabsContent value="registers" className="space-y-4">
            <section aria-label="POS registers" className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Registers</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure physical POS stations for the selected branch.
                  </p>
                </div>
                <Button onClick={() => setRegisterDialogOpen(true)}>
                  <Plus className="size-4" />
                  Add register
                </Button>
              </div>

              <DataTableShell>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={head}>
                        <TableHead className="px-4">Code</TableHead>
                        <TableHead className="px-4">Register</TableHead>
                        <TableHead className="px-4">Status</TableHead>
                        <TableHead className="px-4">Availability</TableHead>
                        <TableHead className="w-28 px-4 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {registers.isPending && <StateRow colSpan={5} loading message="Loading registers…" />}
                      {registers.isError && !registers.isPending && (
                        <StateRow colSpan={5} error message={registers.error.message} />
                      )}
                      {!registers.isPending && !registers.isError && registers.data?.length === 0 && (
                        <StateRow colSpan={5} message="No POS registers configured for this branch." />
                      )}
                      {(registers.data ?? []).map((register) => (
                        <TableRow key={register.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          <TableCell className="px-4 py-3.5 font-mono text-sm text-slate-500">
                            {register.code}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {register.name}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <span className={register.isActive
                              ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800'}>
                              {register.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <span className={register.hasOpenSession
                              ? 'inline-flex rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300'}>
                              {register.hasOpenSession ? 'In use' : 'Available'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              title={register.hasOpenSession
                                ? 'Close the open session before deactivating this register.'
                                : undefined}
                              disabled={updateRegister.isPending || register.hasOpenSession}
                              onClick={() => updateRegister.mutate({
                                id: register.id,
                                body: {
                                  code: register.code,
                                  name: register.name,
                                  isActive: !register.isActive,
                                },
                              })}
                            >
                              {register.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DataTableShell>

              {updateRegister.isError && (
                <p className="text-sm text-destructive">{updateRegister.error.message}</p>
              )}
            </section>
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-4">
          <section aria-label="Z reports" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Z Reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                Immutable closing snapshots for completed POS sessions.
              </p>
            </div>

            <DataTableShell>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={head}>
                      <TableHead className="px-4">Report</TableHead>
                      <TableHead className="px-4">Register</TableHead>
                      <TableHead className="px-4">Cashier</TableHead>
                      <TableHead className="px-4">Closed</TableHead>
                      <TableHead className="px-4 text-right">Sales</TableHead>
                      <TableHead className="px-4 text-right">Gross</TableHead>
                      <TableHead className="px-4 text-right">Refunds</TableHead>
                      <TableHead className="px-4 text-right">Net</TableHead>
                      <TableHead className="px-4 text-right">Variance</TableHead>
                      <TableHead className="w-20 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {reports.isPending && <StateRow colSpan={10} loading message="Loading Z Reports…" />}
                    {reports.isError && !reports.isPending && (
                      <StateRow colSpan={10} error message={reports.error.message} />
                    )}
                    {!reports.isPending && !reports.isError && reports.data?.data.length === 0 && (
                      <StateRow colSpan={10} message="No Z Reports yet." />
                    )}
                    {(reports.data?.data ?? []).map((report) => (
                      <TableRow key={report.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <TableCell className="px-4 py-3.5 font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                          {report.reportNumber}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{report.registerName}</p>
                          <p className="font-mono text-xs text-slate-500">{report.registerCode}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          {report.cashierUsername}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          {dateTime(report.closedAtUtc)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono">{report.saleCount}</TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono">
                          {money(report.grossSalesBase)} {report.baseCurrencyCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono">
                          {money(report.refundTotalBase)} {report.baseCurrencyCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono font-medium">
                          {money(report.netSalesBase)} {report.baseCurrencyCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right font-mono">
                          {signed(report.varianceBase)} {report.baseCurrencyCode}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/pos/z-reports/${report.id}`)}
                            aria-label={`View ${report.reportNumber}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DataTableShell>

            {reports.data && (
              <DataTablePagination
                page={reportPage}
                pageSize={reportPageSize}
                totalItems={reports.data.meta.totalCount}
                onPageChange={setReportPage}
                onPageSizeChange={(size) => {
                  setReportPageSize(size)
                  setReportPage(1)
                }}
              />
            )}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto p-0 sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Open POS Session</DialogTitle>
            <DialogDescription>
              Select an available register and count the opening drawer before selling.
            </DialogDescription>
          </DialogHeader>
          {setup.data ? (
            <OpenSessionScreen
              embedded
              setup={setup.data}
              branch={selectedBranch}
              registers={registers.data ?? []}
              cashier={user?.username ?? 'Cashier'}
              onExit={() => setOpenSessionDialog(false)}
              prepareWorkspaceWindow={prepareWorkspaceWindow}
              onOpened={completeSessionOpen}
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Loading POS setup…</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={registerDialogOpen}
        onOpenChange={(open) => open ? setRegisterDialogOpen(true) : closeRegisterDialog()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add POS register</DialogTitle>
            <DialogDescription>
              Create a physical POS station for the selected branch. Only one open session can use it at a time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <Field label="Register code" error={registerForm.formState.errors.code?.message}>
              <Input {...registerForm.register('code')} placeholder="e.g. RECEPTION" maxLength={32} />
            </Field>
            <Field label="Register name" error={registerForm.formState.errors.name?.message}>
              <Input {...registerForm.register('name')} placeholder="e.g. Reception POS" maxLength={120} />
            </Field>
            {createRegister.isError && (
              <p className="text-sm text-destructive">{createRegister.error.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRegisterDialog} disabled={createRegister.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRegister.isPending}>
                {createRegister.isPending ? 'Creating…' : 'Add register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {drawerSessionId && (
        <DrawerMovementDialog
          sessionId={drawerSessionId}
          open={Boolean(drawerSessionId)}
          onOpenChange={(open) => {
            if (!open) setDrawerSessionId(null)
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ open, current }: { open: boolean; current: boolean }) {
  if (open) {
    return (
      <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        {current ? 'Open · Yours' : 'Open'}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
      Closed
    </span>
  )
}

function StateRow({
  colSpan,
  message,
  loading = false,
  error = false,
}: {
  colSpan: number
  message: string
  loading?: boolean
  error?: boolean
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className={error
          ? 'flex items-center justify-center gap-2 text-sm text-destructive'
          : 'flex items-center justify-center gap-2 text-sm text-slate-500'}
        >
          {loading && <Loader2 className="size-5 animate-spin text-primary" />}
          {error && <AlertCircle className="size-5" />}
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}

const head =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const signed = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`
const dateTime = (value: string) => new Date(value).toLocaleString()
