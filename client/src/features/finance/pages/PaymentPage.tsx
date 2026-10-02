import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/i18n'
import { usePayment } from '../hooks/useFinance'
import { PaymentMoneyDirection, PaymentOrigin } from '../types/finance.types'

const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })

export function PaymentPage() {
  const { t } = useTranslation(['finance', 'common'])
  const { id } = useParams()
  const query = usePayment(id)

  if (query.isPending) {
    return <p className="text-sm text-slate-500">{t('finance:paymentPage.loading')}</p>
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">{t('finance:paymentPage.error')}</p>
  }
  const payment = query.data

  const originLabels: Record<PaymentOrigin, string> = {
    [PaymentOrigin.SalesInvoice]: t('finance:paymentPage.origins.salesInvoice'),
    [PaymentOrigin.CustomerReceipt]: t('finance:paymentPage.origins.customerReceipt'),
    [PaymentOrigin.Pos]: t('finance:paymentPage.origins.pos'),
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {t('finance:paymentPage.title')}{' '}
            <span className="font-mono text-primary">{payment.documentNumber}</span>
          </CardTitle>
          <CardDescription>
            {payment.customerName} · {formatDate(payment.paymentDate)} · {originLabels[payment.origin]}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <p>
            {t('finance:paymentPage.net')} <b>{amount(payment.amount)} {payment.currencyCode}</b>
          </p>
          <p>
            {t('finance:paymentPage.base')} <b>{amount(payment.baseAmount)} {payment.baseCurrencyCode}</b>
          </p>
          {payment.originSourceId && payment.originSourceDocumentNumber && (
            <Link
              className="text-primary hover:underline"
              to={
                payment.origin === PaymentOrigin.CustomerReceipt
                  ? `/finance/customer-receipts/${payment.originSourceId}`
                  : payment.origin === PaymentOrigin.Pos
                    ? `/pos/sales/${payment.originSourceId}`
                    : `/sales/invoices/${payment.originSourceId}`
              }
            >
              {t('finance:paymentPage.source')} {payment.originSourceDocumentNumber}
            </Link>
          )}
          <Link
            className="text-primary hover:underline"
            to={`/accounting/journal?search=${encodeURIComponent(payment.documentNumber)}`}
          >
            {t('finance:paymentPage.accountingJournal')}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance:paymentPage.invoiceAllocations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('finance:paymentPage.th.invoice')}</TableHead>
                <TableHead className="text-end">{t('finance:paymentPage.th.amount')}</TableHead>
                <TableHead className="text-end">{t('finance:paymentPage.th.base')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.allocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="text-start">
                    <Link className="font-mono text-primary hover:underline" to={`/sales/invoices/${allocation.salesInvoiceId}`}>
                      {allocation.salesInvoiceDocumentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-end font-mono">{amount(allocation.amount)}</TableCell>
                  <TableCell className="text-end font-mono">{amount(allocation.baseAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance:paymentPage.moneyMovements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('finance:paymentPage.th.direction')}</TableHead>
                <TableHead className="text-start">{t('finance:paymentPage.th.account')}</TableHead>
                <TableHead className="text-end">{t('finance:paymentPage.th.amount')}</TableHead>
                <TableHead className="text-end">{t('finance:paymentPage.th.rate')}</TableHead>
                <TableHead className="text-end">{t('finance:paymentPage.th.base')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.moneyLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-start">
                    {line.direction === PaymentMoneyDirection.Collection
                      ? t('finance:paymentPage.collection')
                      : t('finance:paymentPage.change')}
                  </TableCell>
                  <TableCell className="text-start">
                    {line.moneyAccountCode} · {line.moneyAccountName}
                  </TableCell>
                  <TableCell className="text-end font-mono">
                    {amount(line.amount)} {line.currencyCode}
                  </TableCell>
                  <TableCell className="text-end font-mono">{amount(line.exchangeRate)}</TableCell>
                  <TableCell className="text-end font-mono">
                    {amount(line.baseAmount)} {payment.baseCurrencyCode}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
