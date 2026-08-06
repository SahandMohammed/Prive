import { useInvoices, useCreateInvoice, useContacts, useCurrencies, useAccounts } from '@/features/finance'
import { InvoiceType, ContactType, AccountCategory } from '@/features/finance'
import type { AccountDto, ContactDto, CurrencyDto, InvoiceDto } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'

export function PurchaseInvoicesPage() {
  // Search and Pagination states
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Queries
  const { data: pagedInvoices, isLoading: invoicesLoading } = useInvoices(
    InvoiceType.PurchaseInvoice,
    search,
    startDate || undefined,
    endDate || undefined,
    page,
    pageSize
  )

  const { data: vendors } = useContacts(ContactType.Vendor)
  const { data: currencies } = useCurrencies()
  const { data: accounts } = useAccounts()
  const createInvoice = useCreateInvoice()

  // Form states
  const [vendorId, setVendorId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [invoiceDate, setInvoiceDate] = useState(getTodayString())

  // Line item states
  const [lines, setLines] = useState<{ description: string; accountId: string; quantity: number; unitPrice: number }[]>([])
  const [lineDesc, setLineDesc] = useState('')
  const [lineAccId, setLineAccId] = useState('')
  const [lineQty, setLineQty] = useState('1')
  const [linePrice, setLinePrice] = useState('0')

  // Expenses or Asset (Inventory) accounts
  const costAccounts = accounts?.filter((a: AccountDto) => 
    (a.category === AccountCategory.Expense || a.category === AccountCategory.Asset) && a.isLeaf
  )

  const handleCurrencyChange = (currId: string) => {
    setCurrencyId(currId)
    const selected = currencies?.find((c: CurrencyDto) => c.id === currId)
    if (selected) {
      setExchangeRate(selected.exchangeRate.toString())
    }
  }

  const addLineItem = () => {
    if (!lineDesc || !lineAccId || Number(lineQty) <= 0 || Number(linePrice) < 0) return
    setLines([...lines, {
      description: lineDesc,
      accountId: lineAccId,
      quantity: Number(lineQty),
      unitPrice: Number(linePrice)
    }])
    setLineDesc('')
    setLineQty('1')
    setLinePrice('0')
  }

  const removeLineItem = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId || !currencyId || lines.length === 0) return

    createInvoice.mutate({
      type: InvoiceType.PurchaseInvoice,
      contactId: vendorId,
      currencyId,
      exchangeRate: Number(exchangeRate),
      lines,
      invoiceDate: new Date(invoiceDate).toISOString()
    }, {
      onSuccess: () => {
        setVendorId('')
        setLines([])
        setIsCreateOpen(false)
      }
    })
  }

  const calculateTotal = () => {
    return lines.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground">Record purchases from vendors and allocate inventory or expense costs.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button size="default">Record New Purchase</Button>} />
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Invoice</DialogTitle>
              <DialogDescription>
                Post inventory asset values or operational expenses with automatic journal balances.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Vendor</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={vendorId} 
                  onChange={e => setVendorId(e.target.value)}
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors?.map((v: ContactDto) => <option key={v.id} value={v.id}>{v.name}</option>)}
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
                <label className="text-xs font-semibold">Invoice Date</label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required />
              </div>

              {/* Line Items Builder */}
              <div className="border-t border-border pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-semibold">Invoice Lines</h4>

                {lines.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-border/50 p-2 rounded bg-muted/20">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-1 border-b border-border/30 last:border-0">
                        <div className="space-y-0.5">
                          <p className="font-semibold">{line.description}</p>
                          <p className="text-[10px] text-muted-foreground">Qty: {line.quantity} × {line.unitPrice.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{(line.quantity * line.unitPrice).toLocaleString()}</span>
                          <button type="button" onClick={() => removeLineItem(idx)} className="text-destructive font-bold">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-muted/30 p-3 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Description</label>
                    <Input value={lineDesc} onChange={e => setLineDesc(e.target.value)} placeholder="Item/Service name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Inventory/Expense Account</label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={lineAccId} 
                      onChange={e => setLineAccId(e.target.value)}
                    >
                      <option value="">Select Account</option>
                      {costAccounts?.map((a: AccountDto) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</label>
                      <Input type="number" min="1" value={lineQty} onChange={e => setLineQty(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Unit Cost</label>
                      <Input type="number" step="0.01" min="0" value={linePrice} onChange={e => setLinePrice(e.target.value)} />
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={addLineItem}>
                    Add Line Item
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4 flex justify-between items-center text-sm font-semibold">
                <span>Total Cost:</span>
                <span className="font-mono">{calculateTotal().toLocaleString()}</span>
              </div>

              <Button type="submit" className="w-full" disabled={createInvoice.isPending || lines.length === 0}>
                Record Purchase
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices Registry</CardTitle>
          <CardDescription>Server-side paginated bills database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 pb-6 border-b border-border">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Search</label>
              <Input 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }} 
                placeholder="Search Vendor or Invoice ID..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Start Date</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={e => { setStartDate(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">End Date</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={e => { setEndDate(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setSearch('')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {invoicesLoading ? (
            <p className="text-sm text-muted-foreground">Loading purchase registry...</p>
          ) : pagedInvoices && pagedInvoices.items.length > 0 ? (
            <div className="space-y-4">
              <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount (Tx)</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Amount (Base)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedInvoices.items.map((inv: InvoiceDto) => {
                    const vend = vendors?.find((v: ContactDto) => v.id === inv.contactId)
                    const currency = currencies?.find((c: CurrencyDto) => c.id === inv.currencyId)
                    const baseAmount = inv.totalAmount * inv.exchangeRate
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{inv.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium">{vend?.name || inv.contactId}</TableCell>
                        <TableCell>{formatDate(inv.invoiceDateUtc)}</TableCell>
                        <TableCell className="text-right font-semibold font-mono">
                          {inv.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{currency?.code}</TableCell>
                        <TableCell className="text-right font-semibold font-mono text-muted-foreground">
                          {baseAmount.toLocaleString()} IQD
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">View Details</Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </DataTableShell>

              <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalItems={pagedInvoices.totalCount}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
              />
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No Purchase Invoices matched your search filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
