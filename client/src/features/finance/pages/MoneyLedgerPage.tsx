import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMoneyAccounts, useMoneyLedger } from '../hooks/useFinance'
import { MoneyLedgerSourceType } from '../types/finance.types'
import type { MoneyLedgerEntry } from '../types/finance.types'

export function MoneyLedgerPage() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [moneyAccountId, setAccount] = useState('')
  const [sourceType, setSource] = useState('')
  const [documentNumber, setDocument] = useState(searchParams.get('documentNumber') ?? '')
  const [fromDate, setFrom] = useState('')
  const [toDate, setTo] = useState('')
  const accounts = useMoneyAccounts({ page: 1, pageSize: 100 }).data?.data ?? []
  const query = useMoneyLedger({ page, pageSize, moneyAccountId: moneyAccountId || undefined, sourceType: sourceType || undefined, documentNumber: documentNumber || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined })
  const rows = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Money Ledger</h1>
        <p className="text-sm text-muted-foreground">Read-only posted movements. Every row links to its Finance source and Accounting journal.</p>
      </header>
      <div className="grid gap-3 md:grid-cols-5">
        <Select value={moneyAccountId} onChange={(event) => { setAccount(event.target.value); setPage(1) }}><option value="">All accessible accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</Select>
        <Select value={sourceType} onChange={(event) => { setSource(event.target.value); setPage(1) }}><option value="">All sources</option><option value="0">Opening balance</option><option value="1">Money transfer</option><option value="2">Supplier payment</option><option value="3">Customer receipt</option><option value="4">POS Sale</option></Select>
        <Input placeholder="Document number" value={documentNumber} onChange={(event) => { setDocument(event.target.value); setPage(1) }} />
        <Input type="date" value={fromDate} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
        <Input type="date" value={toDate} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Date / document</TableHead><TableHead>Source</TableHead><TableHead>Money Account</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead><TableHead className="text-right">Base value</TableHead><TableHead>User / notes</TableHead></TableRow></TableHeader>
          <TableBody>
            {query.isPending ? <Message text="Loading ledger…" /> : query.isError ? <Message text={query.error.message} /> : rows.length === 0 ? <Message text="No posted movements found." /> : rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell><p>{entry.movementDate}</p><SourceLink entry={entry} /></TableCell>
                <TableCell>{sourceLabel[entry.sourceType]}</TableCell>
                <TableCell><p className="font-mono">{entry.moneyAccountCode}</p><p className="text-xs text-muted-foreground">{entry.moneyAccountName}</p></TableCell>
                <TableCell>{entry.currencyCode}</TableCell>
                <TableCell className="text-right font-mono text-emerald-700">{entry.amountIn ? amount(entry.amountIn) : '—'}</TableCell>
                <TableCell className="text-right font-mono text-rose-700">{entry.amountOut ? amount(entry.amountOut) : '—'}</TableCell>
                <TableCell className="text-right font-mono">{amount(Math.abs(entry.baseAmount))} {entry.baseCurrencyCode}</TableCell>
                <TableCell><p>{entry.performedByUsername}</p><p className="text-xs text-muted-foreground">{entry.notes ?? '—'}</p><Link className="text-xs text-primary" to={`/accounting/journal?search=${encodeURIComponent(entry.documentNumber)}`}>Accounting journal</Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination page={page} pageSize={pageSize} totalItems={query.data?.meta.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
    </div>
  )
}

function SourceLink({ entry }: { entry: MoneyLedgerEntry }) {
  if (entry.sourceType === MoneyLedgerSourceType.CustomerReceipt)
    return <Link className="font-mono text-xs text-primary" to={`/finance/customer-receipts/${entry.sourceDocumentId}`}>{entry.documentNumber}</Link>
  if (entry.sourceType === MoneyLedgerSourceType.PosSale)
    return <Link className="font-mono text-xs text-primary" to={`/pos/sales/${entry.sourceDocumentId}`}>{entry.documentNumber}</Link>
  return <p className="font-mono text-xs text-primary">{entry.documentNumber}</p>
}

const sourceLabel: Record<MoneyLedgerSourceType, string> = {
  [MoneyLedgerSourceType.OpeningBalance]: 'Opening balance',
  [MoneyLedgerSourceType.MoneyTransfer]: 'Money transfer',
  [MoneyLedgerSourceType.SupplierPayment]: 'Supplier payment',
  [MoneyLedgerSourceType.CustomerReceipt]: 'Customer receipt',
  [MoneyLedgerSourceType.PosSale]: 'POS Sale',
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} /> }
function Message({ text }: { text: string }) { return <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{text}</TableCell></TableRow> }
const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
