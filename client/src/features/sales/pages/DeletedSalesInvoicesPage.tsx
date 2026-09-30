import { useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDeletedSalesInvoices, useSalesInvoiceHistory } from '../hooks/useSales'

export function DeletedSalesInvoicesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [historyInvoiceId, setHistoryInvoiceId] = useState<string>()
  const query = useDeletedSalesInvoices({
    page,
    pageSize,
    search: search.trim() || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const rows = query.data?.data ?? []
  const history = useSalesInvoiceHistory(historyInvoiceId, Boolean(historyInvoiceId))
  const historyInvoice = rows.find((invoice) => invoice.id === historyInvoiceId)

  return <div className="flex min-h-full flex-col space-y-6 pb-10 sm:pb-12">
    <div className="flex items-center gap-3"><Link to="/sales/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link><div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Trash2 className="size-5" />Deleted Sales Invoices</h1><p className="mt-1 text-sm text-muted-foreground">Soft-deleted documents remain reserved and available for audit.</p></div></div>
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3"><Input aria-label="Search deleted invoices" placeholder="Document number or customer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /><Input aria-label="Deleted invoices from date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} /><Input aria-label="Deleted invoices to date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} /></div>
    <DataTableShell><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Customer</TableHead><TableHead>Invoice date</TableHead><TableHead>Branch</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Deleted by</TableHead><TableHead>Deleted</TableHead><TableHead>Reason</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.isPending ? <Message label="Loading deleted invoices…" /> : query.isError ? <Message label={query.error.message} error /> : rows.length === 0 ? <Message label="No deleted Sales Invoices found." /> : rows.map((invoice) => <TableRow key={invoice.id}><TableCell className="font-mono font-semibold">{invoice.documentNumber}{invoice.isPosSale && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">POS</span>}</TableCell><TableCell>{invoice.customerName}</TableCell><TableCell>{invoice.invoiceDate}</TableCell><TableCell>{invoice.branchName}</TableCell><TableCell className="text-right font-mono">{formatAmount(invoice.total)}</TableCell><TableCell>{invoice.deletedByUsername}</TableCell><TableCell>{new Date(invoice.deletedAtUtc).toLocaleString()}</TableCell><TableCell className="max-w-72 whitespace-normal">{invoice.deleteReason}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => setHistoryInvoiceId(invoice.id)}>History</Button></TableCell></TableRow>)}</TableBody></Table></div></DataTableShell>
    <DataTablePagination page={page} pageSize={pageSize} totalItems={query.data?.meta.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
    <Dialog open={Boolean(historyInvoiceId)} onOpenChange={(open) => { if (!open) setHistoryInvoiceId(undefined) }}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{historyInvoice?.documentNumber ?? 'Invoice'} history</DialogTitle><DialogDescription>Immutable invoice activity and snapshots.</DialogDescription></DialogHeader><div className="max-h-[70vh] space-y-3 overflow-auto">{history.isPending ? <p className="text-muted-foreground">Loading history…</p> : history.isError ? <p className="text-destructive">{history.error.message}</p> : history.data?.map((entry) => <div key={entry.id} className="rounded-md border p-3"><p className="font-medium capitalize">Invoice {entry.action}</p><p className="text-muted-foreground">{entry.changedByUsername} · {new Date(entry.changedAtUtc).toLocaleString()}</p>{entry.reason && <p className="mt-2">Reason: {entry.reason}</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{entry.beforeState !== null && <Snapshot label="View before" value={entry.beforeState} />}{entry.afterState !== null && <Snapshot label="View after" value={entry.afterState} />}</div></div>)}</div></DialogContent></Dialog>
  </div>
}

function Message({ label, error = false }: { label: string; error?: boolean }) { return <TableRow><TableCell colSpan={9} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</TableCell></TableRow> }
function Snapshot({ label, value }: { label: string; value: unknown }) { return <details className="rounded bg-muted p-2 text-xs"><summary className="cursor-pointer font-medium">{label}</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre></details> }
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
