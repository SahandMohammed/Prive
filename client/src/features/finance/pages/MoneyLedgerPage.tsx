import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/i18n'
import { useMoneyAccounts, useMoneyLedger } from '../hooks/useFinance'
import { MoneyLedgerSourceType } from '../types/finance.types'
import type { MoneyLedgerEntry } from '../types/finance.types'

export function MoneyLedgerPage() {
  const { t } = useTranslation(['finance', 'common'])
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [moneyAccountId, setAccount] = useState('')
  const [sourceType, setSource] = useState('')
  const [documentNumber, setDocument] = useState(searchParams.get('documentNumber') ?? '')
  const [fromDate, setFrom] = useState('')
  const [toDate, setTo] = useState('')
  const accounts = useMoneyAccounts({ page: 1, pageSize: 100 }).data?.data ?? []
  const query = useMoneyLedger({
    page,
    pageSize,
    moneyAccountId: moneyAccountId || undefined,
    sourceType: sourceType || undefined,
    documentNumber: documentNumber || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const rows = query.data?.data ?? []

  const sourceLabels: Record<MoneyLedgerSourceType, string> = {
    [MoneyLedgerSourceType.OpeningBalance]: t('finance:moneyLedgerPage.sources.openingBalance'),
    [MoneyLedgerSourceType.MoneyTransfer]: t('finance:moneyLedgerPage.sources.moneyTransfer'),
    [MoneyLedgerSourceType.SupplierPayment]: t('finance:moneyLedgerPage.sources.supplierPayment'),
    [MoneyLedgerSourceType.Expense]: t('finance:moneyLedgerPage.sources.expense'),
    [MoneyLedgerSourceType.PosRefund]: t('finance:moneyLedgerPage.sources.posRefund'),
    [MoneyLedgerSourceType.Payment]: t('finance:moneyLedgerPage.sources.payment'),
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('finance:moneyLedgerPage.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('finance:moneyLedgerPage.description')}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-5">
        <Select value={moneyAccountId} onChange={(event) => { setAccount(event.target.value); setPage(1) }}>
          <option value="">{t('finance:moneyLedgerPage.allAccounts')}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
          ))}
        </Select>
        <Select value={sourceType} onChange={(event) => { setSource(event.target.value); setPage(1) }}>
          <option value="">{t('finance:moneyLedgerPage.allSources')}</option>
          <option value="0">{t('finance:moneyLedgerPage.sources.openingBalance')}</option>
          <option value="1">{t('finance:moneyLedgerPage.sources.moneyTransfer')}</option>
          <option value="2">{t('finance:moneyLedgerPage.sources.supplierPayment')}</option>
          <option value="3">{t('finance:moneyLedgerPage.sources.customerReceipt')}</option>
          <option value="4">{t('finance:moneyLedgerPage.sources.posSale')}</option>
          <option value="5">{t('finance:moneyLedgerPage.sources.expense')}</option>
          <option value="6">{t('finance:moneyLedgerPage.sources.posRefund')}</option>
        </Select>
        <Input placeholder={t('finance:moneyLedgerPage.documentNumber')} value={documentNumber} onChange={(event) => { setDocument(event.target.value); setPage(1) }} />
        <Input type="date" aria-label={t('finance:moneyLedgerPage.fromDate')} value={fromDate} onChange={(event) => { setFrom(event.target.value); setPage(1) }} />
        <Input type="date" aria-label={t('finance:moneyLedgerPage.toDate')} value={toDate} onChange={(event) => { setTo(event.target.value); setPage(1) }} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t('finance:moneyLedgerPage.th.dateDocument')}</TableHead>
              <TableHead className="text-start">{t('finance:moneyLedgerPage.th.source')}</TableHead>
              <TableHead className="text-start">{t('finance:moneyLedgerPage.th.moneyAccount')}</TableHead>
              <TableHead className="text-start">{t('finance:moneyLedgerPage.th.currency')}</TableHead>
              <TableHead className="text-end">{t('finance:moneyLedgerPage.th.in')}</TableHead>
              <TableHead className="text-end">{t('finance:moneyLedgerPage.th.out')}</TableHead>
              <TableHead className="text-end">{t('finance:moneyLedgerPage.th.baseValue')}</TableHead>
              <TableHead className="text-start">{t('finance:moneyLedgerPage.th.userNotes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <Message text={t('finance:moneyLedgerPage.loading')} />
            ) : query.isError ? (
              <Message text={query.error.message} />
            ) : rows.length === 0 ? (
              <Message text={t('finance:moneyLedgerPage.empty')} />
            ) : (
              rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-start">
                    <p>{formatDate(entry.movementDate)}</p>
                    <SourceLink entry={entry} />
                  </TableCell>
                  <TableCell className="text-start">{sourceLabels[entry.sourceType] ?? entry.sourceType}</TableCell>
                  <TableCell className="text-start">
                    <p className="font-mono">{entry.moneyAccountCode}</p>
                    <p className="text-xs text-muted-foreground">{entry.moneyAccountName}</p>
                  </TableCell>
                  <TableCell className="text-start">{entry.currencyCode}</TableCell>
                  <TableCell className="text-end font-mono text-emerald-700">
                    {entry.amountIn ? formatNumber(entry.amountIn, { maximumFractionDigits: 4 }) : '—'}
                  </TableCell>
                  <TableCell className="text-end font-mono text-rose-700">
                    {entry.amountOut ? formatNumber(entry.amountOut, { maximumFractionDigits: 4 }) : '—'}
                  </TableCell>
                  <TableCell className="text-end font-mono">
                    {formatNumber(Math.abs(entry.baseAmount), { maximumFractionDigits: 4 })} {entry.baseCurrencyCode}
                  </TableCell>
                  <TableCell className="text-start">
                    <p>{entry.performedByUsername}</p>
                    <p className="text-xs text-muted-foreground">{entry.notes ?? '—'}</p>
                    <Link className="text-xs text-primary hover:underline" to={`/accounting/journal?search=${encodeURIComponent(entry.documentNumber)}`}>
                      {t('finance:moneyLedgerPage.accountingJournal')}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => { setPageSize(value); setPage(1) }}
      />
    </div>
  )
}

function SourceLink({ entry }: { entry: MoneyLedgerEntry }) {
  if (entry.sourceType === MoneyLedgerSourceType.Payment)
    return <Link className="font-mono text-xs text-primary hover:underline" to={`/finance/payments/${entry.sourceDocumentId}`}>{entry.documentNumber}</Link>
  if (entry.sourceType === MoneyLedgerSourceType.PosRefund)
    return <Link className="font-mono text-xs text-primary hover:underline" to={`/pos/refunds/${entry.sourceDocumentId}`}>{entry.documentNumber}</Link>
  return <p className="font-mono text-xs text-primary">{entry.documentNumber}</p>
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} />
}

function Message({ text }: { text: string }) {
  return <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{text}</TableCell></TableRow>
}
