import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/i18n'
import { useCustomerAccountSummary, useCustomerStatement } from '../hooks/useFinance'
import { CustomerAccountEntryType } from '../types/finance.types'

const isoDate = (date: Date) => date.toLocaleDateString('en-CA')
const initialFrom = () => { const date = new Date(); date.setMonth(date.getMonth() - 3); return isoDate(date) }
const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })

export function CustomerAccountPanel({ customerId }: { customerId: string }) {
  const { t } = useTranslation(['finance', 'common'])
  const [fromDate, setFromDate] = useState(initialFrom)
  const [toDate, setToDate] = useState(() => isoDate(new Date()))
  const [pageNumber, setPageNumber] = useState(1)
  const summary = useCustomerAccountSummary(customerId)
  const statement = useCustomerStatement(customerId, { fromDate, toDate, pageNumber, pageSize: 25 })

  if (summary.isPending) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-500">
          {t('finance:customerAccount.loading')}
        </CardContent>
      </Card>
    )
  }
  if (summary.isError || !summary.data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">
          {t('finance:customerAccount.error')}
        </CardContent>
      </Card>
    )
  }
  const data = summary.data
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('finance:customerAccount.title', { name: data.customerName })}</CardTitle>
          <CardDescription>{t('finance:customerAccount.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label={t('finance:customerAccount.receivable')} value={data.totalReceivable} currency={data.baseCurrencyCode} />
            <Metric label={t('finance:customerAccount.collected')} value={data.totalCollected} currency={data.baseCurrencyCode} />
            <Metric label={t('finance:customerAccount.outstanding')} value={data.outstanding} currency={data.baseCurrencyCode} />
            <Metric label={t('finance:customerAccount.credit')} value={data.credit} currency={data.baseCurrencyCode} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.currencies.map((currency) => (
              <div key={currency.currencyId} className="rounded-lg border p-3 text-sm">
                <p className="font-semibold">{currency.currencyCode}</p>
                <p className="text-muted-foreground">
                  {t('finance:customerAccount.receivable')} {amount(currency.totalReceivable)} · {t('finance:customerAccount.collected')} {amount(currency.totalCollected)}
                </p>
                <p className={currency.netBalance < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}>
                  {currency.netBalance < 0 ? t('finance:customerAccount.credit') : t('finance:customerAccount.netBalance')} {amount(Math.abs(currency.netBalance))}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance:customerAccount.statement')}</CardTitle>
          <CardDescription>{t('finance:customerAccount.statementDesc', { currency: data.baseCurrencyCode })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-muted-foreground">
              {t('finance:customerAccount.from')}
              <Input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPageNumber(1) }} />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('finance:customerAccount.to')}
              <Input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPageNumber(1) }} />
            </label>
            {statement.data && (
              <div className="ms-auto self-end text-sm">
                {t('finance:customerAccount.opening')} <b>{amount(statement.data.openingBalance)}</b> · {t('finance:customerAccount.closing')} <b>{amount(statement.data.closingBalance)}</b>
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('finance:customerAccount.th.date')}</TableHead>
                <TableHead className="text-start">{t('finance:customerAccount.th.document')}</TableHead>
                <TableHead className="text-start">{t('finance:customerAccount.th.type')}</TableHead>
                <TableHead className="text-end">{t('finance:customerAccount.th.native')}</TableHead>
                <TableHead className="text-end">{t('finance:customerAccount.th.impact')}</TableHead>
                <TableHead className="text-end">{t('finance:customerAccount.th.balance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.isPending && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                    {t('finance:customerAccount.loadingStatement')}
                  </TableCell>
                </TableRow>
              )}
              {statement.data?.entries.map((entry) => (
                <TableRow key={`${entry.entryType}-${entry.sourceId}`}>
                  <TableCell className="text-start">{formatDate(entry.eventDate)}</TableCell>
                  <TableCell className="text-start"><SourceLink entry={entry} /></TableCell>
                  <TableCell className="text-start">{entry.origin}</TableCell>
                  <TableCell className="text-end font-mono">{amount(entry.amount)} {entry.currencyCode}</TableCell>
                  <TableCell className="text-end font-mono">{amount(entry.signedBaseBalanceImpact)} {data.baseCurrencyCode}</TableCell>
                  <TableCell className="text-end font-mono font-semibold">{amount(entry.runningBaseBalance)} {data.baseCurrencyCode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {statement.data && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={!statement.data.pagination.hasPreviousPage} onClick={() => setPageNumber((page) => page - 1)}>
                {t('common:actions.previous')}
              </Button>
              <Button variant="outline" disabled={!statement.data.pagination.hasNextPage} onClick={() => setPageNumber((page) => page + 1)}>
                {t('common:actions.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold">{amount(value)} {currency}</p>
    </div>
  )
}

function SourceLink({ entry }: { entry: { entryType: number; sourceId: string; documentNumber: string; origin: string; relatedSourceId: string | null; relatedDocumentNumber: string | null } }) {
  if (entry.entryType === CustomerAccountEntryType.Invoice) return <Link className="text-primary" to={`/sales/invoices/${entry.sourceId}`}>{entry.documentNumber}</Link>
  if (entry.entryType === CustomerAccountEntryType.RefundReceivableAdjustment) return <Link className="text-primary" to={`/pos/refunds/${entry.sourceId}`}>{entry.documentNumber}</Link>
  const relatedPath = entry.origin === 'CustomerReceipt'
    ? `/finance/customer-receipts/${entry.relatedSourceId}`
    : entry.origin === 'Pos'
      ? `/pos/sales/${entry.relatedSourceId}`
      : entry.origin === 'SalesInvoice'
        ? `/sales/invoices/${entry.relatedSourceId}`
        : null
  return <span><Link className="text-primary" to={`/finance/payments/${entry.sourceId}`}>{entry.documentNumber}</Link>{relatedPath && entry.relatedDocumentNumber && <> · <Link className="text-primary" to={relatedPath}>{entry.relatedDocumentNumber}</Link></>}</span>
}
