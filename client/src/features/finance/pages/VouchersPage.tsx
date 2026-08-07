import { useVouchers, useCreateVoucher, useAccounts, useContacts, useCurrencies, useInvoices } from '@/features/finance'
import { VoucherType, ContactType, InvoiceType } from '@/features/finance'
import type { AccountDto, ContactDto, CurrencyDto, InvoiceDto, VoucherDto } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'

export function VouchersPage() {
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers()
  const { data: accounts } = useAccounts()
  const { data: currencies } = useCurrencies()
  const createVoucher = useCreateVoucher()

  const [type, setType] = useState<VoucherType>(VoucherType.Receipt)
  const [treasuryAccountId, setTreasuryAccountId] = useState('')
  const [contactId, setContactId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [amount, setAmount] = useState('')
  
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [voucherDate, setVoucherDate] = useState(getTodayString())
  
  // Allocate payments
  const [allocatedInvoices, setAllocatedInvoices] = useState<{ invoiceId: string; allocatedAmount: number }[]>([])

  // Filter accounts for treasury (Cash & Bank group children)
  const treasuries = accounts?.filter((a: AccountDto) => a.parentAccountId !== null && a.code.startsWith('110'))
  // Filter contacts by type matching voucher type (Receipt -> Customer, Payment -> Vendor)
  const contactType = type === VoucherType.Receipt ? ContactType.Customer : ContactType.Vendor
  const { data: contacts } = useContacts(contactType)
  
  // Fetch outstanding invoices for selected contact to support allocations
  const invoiceType = type === VoucherType.Receipt ? InvoiceType.SalesInvoice : InvoiceType.PurchaseInvoice
  const { data: invoices } = useInvoices(invoiceType)
  const contactInvoices = invoices?.data.filter((i: InvoiceDto) => i.contactId === contactId)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContactId('')
    setAllocatedInvoices([])
  }, [type])

  const handleCurrencyChange = (currId: string) => {
    setCurrencyId(currId)
    const selected = currencies?.find((c: CurrencyDto) => c.id === currId)
    if (selected) {
      setExchangeRate(selected.exchangeRate.toString())
    }
  }

  const handleAllocationChange = (invoiceId: string, allocAmt: number) => {
    const existingIdx = allocatedInvoices.findIndex(a => a.invoiceId === invoiceId)
    if (existingIdx >= 0) {
      const updated = [...allocatedInvoices]
      if (allocAmt <= 0) {
        updated.splice(existingIdx, 1)
      } else {
        updated[existingIdx].allocatedAmount = allocAmt
      }
      setAllocatedInvoices(updated)
    } else if (allocAmt > 0) {
      setAllocatedInvoices([...allocatedInvoices, { invoiceId, allocatedAmount: allocAmt }])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!treasuryAccountId || !currencyId || !amount) return

    createVoucher.mutate({
      type,
      treasuryAccountId,
      contactId: contactId || null,
      currencyId,
      exchangeRate: Number(exchangeRate),
      totalAmount: Number(amount),
      voucherDate: new Date(voucherDate).toISOString(),
      allocations: allocatedInvoices
    }, {
      onSuccess: () => {
        setAmount('')
        setAllocatedInvoices([])
      }
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Receipt & Payment Vouchers</h1>
        <p className="text-sm text-muted-foreground">Issue payment allocations to settle debts or deposit customer receipts.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Vouchers Ledger</CardTitle>
            <CardDescription>All posted Cash In/Out vouchers.</CardDescription>
          </CardHeader>
          <CardContent>
            {vouchersLoading ? (
              <p className="text-sm text-muted-foreground">Loading vouchers...</p>
            ) : vouchers && vouchers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Treasury</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v: VoucherDto) => {
                    const safe = accounts?.find((a: AccountDto) => a.id === v.treasuryAccountId)
                    const contactObj = contacts?.find((c: ContactDto) => c.id === v.contactId)
                    const curr = currencies?.find((c: CurrencyDto) => c.id === v.currencyId)
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-semibold">
                          {v.type === VoucherType.Receipt ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">Receipt</span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">Payment</span>
                          )}
                        </TableCell>
                        <TableCell>{safe?.name || v.treasuryAccountId}</TableCell>
                        <TableCell>{contactObj?.name || 'N/A'}</TableCell>
                        <TableCell>{formatDate(v.voucherDateUtc)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {v.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{curr?.code}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No financial vouchers recorded. Post a voucher from the registry.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Voucher</CardTitle>
            <CardDescription>Record safe entries linked to accounts receivable/payable.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Voucher Type</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={type} 
                  onChange={e => setType(Number(e.target.value) as VoucherType)}
                >
                  <option value={VoucherType.Receipt}>Receipt (Money In)</option>
                  <option value={VoucherType.Payment}>Payment (Money Out)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Treasury (Safe/Bank)</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={treasuryAccountId} 
                  onChange={e => setTreasuryAccountId(e.target.value)}
                  required
                >
                  <option value="">Select Treasury Box</option>
                  {treasuries?.map((t: AccountDto) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  {type === VoucherType.Receipt ? 'Customer' : 'Vendor'}
                </label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={contactId} 
                  onChange={e => setContactId(e.target.value)}
                  required
                >
                  <option value="">Select Contact</option>
                  {contacts?.map((c: ContactDto) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Currency</label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={currencyId} 
                    onChange={e => handleCurrencyChange(e.target.value)}
                    required
                  >
                    <option value="">Select Currency</option>
                    {currencies?.map((c: CurrencyDto) => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Exchange Rate</label>
                  <Input type="number" step="0.0001" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Amount</label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Voucher Date</label>
                <Input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} required />
              </div>

              {/* Outstanding Invoices Allocation */}
              {contactId && contactInvoices && contactInvoices.length > 0 && (
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Outstanding Invoices Allocation</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {contactInvoices.map((invoice: InvoiceDto) => {
                      const allocated = allocatedInvoices.find(a => a.invoiceId === invoice.id)?.allocatedAmount || 0
                      return (
                        <div key={invoice.id} className="flex justify-between items-center text-xs p-1 border border-border/50 rounded bg-muted/10">
                          <div>
                            <p className="font-semibold">Invoice Ref: {invoice.id.substring(0, 8)}...</p>
                            <p className="text-[10px] text-muted-foreground">Total: {invoice.totalAmount.toLocaleString()}</p>
                          </div>
                          <div className="w-24">
                            <Input 
                              type="number" 
                              placeholder="Allocate" 
                              className="h-7 text-xs font-mono"
                              value={allocated || ''} 
                              onChange={e => handleAllocationChange(invoice.id, Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createVoucher.isPending || !amount}>
                Post Voucher
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
