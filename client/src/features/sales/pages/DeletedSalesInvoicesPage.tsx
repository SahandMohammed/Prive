import { useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber, formatDateTime } from '@/lib/i18n'
import { useDeletedSalesInvoices, useSalesInvoiceHistory } from '../hooks/useSales'

export function DeletedSalesInvoicesPage() {
  const { t } = useTranslation(['sales', 'common'])
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

  return (
    <div className="flex min-h-full flex-col space-y-6 pb-10 sm:pb-12">
      <div className="flex items-center gap-3">
        <Link to="/sales/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4 rtl:rotate-180" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trash2 className="size-5" />
            {t('sales:deleted.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('sales:deleted.subtitle')}</p>
        </div>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
        <Input
          aria-label={t('sales:deleted.searchAria')}
          placeholder={t('sales:deleted.searchPlaceholder')}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
        />
        <Input
          aria-label={t('sales:deleted.fromDateAria')}
          type="date"
          value={fromDate}
          onChange={(event) => { setFromDate(event.target.value); setPage(1) }}
        />
        <Input
          aria-label={t('sales:deleted.toDateAria')}
          type="date"
          value={toDate}
          onChange={(event) => { setToDate(event.target.value); setPage(1) }}
        />
      </div>
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sales:deleted.document')}</TableHead>
                <TableHead>{t('sales:deleted.customer')}</TableHead>
                <TableHead>{t('sales:deleted.invoiceDate')}</TableHead>
                <TableHead>{t('sales:deleted.branch')}</TableHead>
                <TableHead className="text-end">{t('sales:deleted.total')}</TableHead>
                <TableHead>{t('sales:deleted.deletedBy')}</TableHead>
                <TableHead>{t('sales:deleted.deletedAt')}</TableHead>
                <TableHead>{t('sales:deleted.reason')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <Message label={t('sales:deleted.loading')} />
              ) : query.isError ? (
                <Message label={query.error.message} error />
              ) : rows.length === 0 ? (
                <Message label={t('sales:deleted.noDeleted')} />
              ) : (
                rows.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">
                      {invoice.documentNumber}
                      {invoice.isPosSale && (
                        <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {t('sales:deleted.posBadge')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell>{invoice.branchName}</TableCell>
                    <TableCell className="text-end font-mono">{formatNumber(invoice.total, { maximumFractionDigits: 4 })}</TableCell>
                    <TableCell>{invoice.deletedByUsername}</TableCell>
                    <TableCell>{formatDateTime(invoice.deletedAtUtc)}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal">{invoice.deleteReason}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setHistoryInvoiceId(invoice.id)}>
                        {t('sales:deleted.history')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => { setPageSize(value); setPage(1) }}
      />
      <Dialog open={Boolean(historyInvoiceId)} onOpenChange={(open) => { if (!open) setHistoryInvoiceId(undefined) }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('sales:deleted.historyTitle', { docNumber: historyInvoice?.documentNumber ?? t('sales:deleted.defaultInvoiceTitle') })}
            </DialogTitle>
            <DialogDescription>{t('sales:deleted.historyDesc')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-auto">
            {history.isPending ? (
              <p className="text-muted-foreground">{t('sales:deleted.loadingHistory')}</p>
            ) : history.isError ? (
              <p className="text-destructive">{history.error.message}</p>
            ) : (
              history.data?.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium capitalize">{entry.action}</p>
                    <Badge variant="outline">{entry.source}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {entry.changedByUsername} · {formatDateTime(entry.changedAtUtc)}
                  </p>
                  {entry.reason && <p className="mt-2">{t('sales:deleted.reasonPrefix', { reason: entry.reason })}</p>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {entry.beforeState !== null && <Snapshot label={t('sales:deleted.viewBefore')} value={entry.beforeState} />}
                    {entry.afterState !== null && <Snapshot label={t('sales:deleted.viewAfter')} value={entry.afterState} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Message({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={9} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
        {label}
      </TableCell>
    </TableRow>
  )
}

function Snapshot({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="rounded bg-muted p-2 text-xs">
      <summary className="cursor-pointer font-medium">{label}</summary>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
    </details>
  )
}
