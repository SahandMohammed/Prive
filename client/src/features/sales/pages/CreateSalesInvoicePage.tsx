import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Calendar, CreditCard, ScanLine, Save, ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mock Data
const MOCK_CUSTOMERS = [
  { id: 'cust-1', name: 'DEVOTEAM' },
  { id: 'cust-2', name: 'ASIACELL TELECOM' },
  { id: 'cust-3', name: 'ZAIN IRAQ' },
]

const MOCK_PRODUCTS = [
  { id: 'p-1', name: 'Premium Consulting Hour', unit: 'hr', price: 150 },
  { id: 'p-2', name: 'Software License (Annual)', unit: 'ea', price: 1200 },
  { id: 'p-3', name: 'Hardware Setup Fee', unit: 'lump', price: 500 },
  { id: 'p-4', name: 'Monthly Retainer', unit: 'mo', price: 3000 },
]

const MOCK_CURRENCIES = [
  { id: 'curr-usd', code: 'USD', symbol: '$' },
  { id: 'curr-iqd', code: 'IQD', symbol: 'د.ع' },
  { id: 'curr-eur', code: 'EUR', symbol: '€' },
]

const MOCK_MONEYBOXES = [
  { id: 'box-1', name: 'Main Cash Till' },
  { id: 'box-2', name: 'Bank Account (USD)' },
  { id: 'box-3', name: 'Safe Box' },
]

interface InvoiceLine {
  id: string
  productId: string
  productName: string
  qty: number
  unit: string
  unitPrice: number
  discountType: 'Cash' | 'Rate'
  discountValue: number
}

interface PaymentLine {
  id: string
  amount: number
  date: string
  method: string
  moneyboxId: string
}

export function CreateSalesInvoicePage() {
  const navigate = useNavigate()

  // Header Details
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceCode] = useState(() => `F - ${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(10 + Math.random() * 90)}`)
  const [currencyId, setCurrencyId] = useState('curr-usd')
  const [invoiceNote, setInvoiceNote] = useState('')

  // Global Discount
  const [globalDiscountType, setGlobalDiscountType] = useState<'Cash' | 'Rate'>('Cash')
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0)

  // Customer Search Combobox State
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false)
  const selectedCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId)

  // Barcode / Scanner
  const [barcodeScan, setBarcodeScan] = useState('')

  // Lines
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: 'initial',
      productId: '',
      productName: '',
      qty: 1,
      unit: 'ea',
      unitPrice: 0,
      discountType: 'Cash',
      discountValue: 0,
    },
  ])

  // Payment Type
  const [invoiceType, setInvoiceType] = useState<'Debt' | 'Paid'>('Debt')

  // Payments
  const [payments, setPayments] = useState<PaymentLine[]>([])

  // Search Combobox State for Table
  const [activeSearchLine, setActiveSearchLine] = useState<string | null>(null)

  const selectedCurrency = MOCK_CURRENCIES.find((c) => c.id === currencyId) || MOCK_CURRENCIES[0]
  const currencySymbol = selectedCurrency.symbol

  // Handlers
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: '',
        productName: '',
        qty: 1,
        unit: 'ea',
        unitPrice: 0,
        discountType: 'Cash',
        discountValue: 0,
      },
    ])
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  const updateLine = (id: string, field: keyof InvoiceLine, value: InvoiceLine[keyof InvoiceLine]) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const selectProduct = (lineId: string, product: (typeof MOCK_PRODUCTS)[0]) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              unitPrice: product.price,
            }
          : l
      )
    )
    setActiveSearchLine(null)
  }

  // Math
  const calculateLineTotal = (l: InvoiceLine) => {
    const base = l.qty * l.unitPrice
    const discountAmount =
      l.discountType === 'Rate' ? base * (l.discountValue / 100) : l.discountValue
    return Math.max(0, base - discountAmount)
  }

  const subtotal = lines.reduce((sum, l) => sum + calculateLineTotal(l), 0)
  const globalDiscountAmount =
    globalDiscountType === 'Rate' ? subtotal * (globalDiscountValue / 100) : globalDiscountValue
  const finalTotal = Math.max(0, subtotal - globalDiscountAmount)

  const addPayment = () => {
    const remaining = finalTotal - payments.reduce((sum, p) => sum + p.amount, 0)
    setPayments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        amount: remaining > 0 ? remaining : 0,
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        moneyboxId: MOCK_MONEYBOXES[0].id,
      },
    ])
  }

  const updatePayment = (id: string, field: keyof PaymentLine, value: PaymentLine[keyof PaymentLine]) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const removePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => navigate('/sales/invoices')}
            className="rounded-full shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              Create Sales Invoice
            </h1>
            <p className="text-sm text-slate-500">Drafting new invoice {invoiceCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/sales/invoices')}
            className="shadow-2xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button className="bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-xs gap-1.5 px-6 cursor-pointer">
            <Save className="w-4 h-4" /> Save Invoice
          </Button>
        </div>
      </div>

      {/* TWO COLUMNS: INVOICE (LEFT) AND PAYMENT (RIGHT) */}
      <div className="flex gap-6 h-full min-h-0 overflow-hidden items-start">
        {/* LEFT: INVOICE BUILDER */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20">
          {/* Top Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs p-5">
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Date
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="shadow-xs bg-slate-50 dark:bg-slate-800/50"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer
                </label>
                <Input
                  placeholder="Search Customer..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setCustomerId('')
                  }}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  className="shadow-xs bg-slate-50 dark:bg-slate-800/50 cursor-text"
                />
                {isCustomerSearchOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => {
                        setIsCustomerSearchOpen(false)
                        if (selectedCustomer) setCustomerSearch(selectedCustomer.name)
                        else setCustomerSearch('')
                      }}
                    />
                    <div className="absolute top-[64px] left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto py-1">
                      {MOCK_CUSTOMERS.filter((c) =>
                        c.name.toLowerCase().includes(customerSearch.toLowerCase())
                      ).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomerId(c.id)
                            setCustomerSearch(c.name)
                            setIsCustomerSearchOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          {c.name}
                        </button>
                      ))}
                      {MOCK_CUSTOMERS.filter((c) =>
                        c.name.toLowerCase().includes(customerSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center">
                          No customers found.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice ID
                </label>
                <Input
                  value={invoiceCode}
                  readOnly
                  disabled
                  className="shadow-xs font-mono bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Currency
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 text-sm shadow-xs cursor-pointer"
                  value={currencyId}
                  onChange={(e) => setCurrencyId(e.target.value)}
                >
                  {MOCK_CURRENCIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Barcode Fast Add */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex items-center px-4 h-14">
            <ScanLine className="w-5 h-5 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Scan Barcode to fast-add item..."
              value={barcodeScan}
              onChange={(e) => setBarcodeScan(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-400"
            />
            {barcodeScan && (
              <Button size="sm" variant="secondary" className="cursor-pointer">
                Add
              </Button>
            )}
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500">
                  <TableHead className="w-[30%]">Item Description</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-28">Unit Price</TableHead>
                  <TableHead className="w-32">Discount</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow
                    key={line.id}
                    className="border-b border-slate-100 dark:border-slate-800/80 group"
                  >
                    <TableCell className="p-2 relative">
                      <Input
                        placeholder="Search product..."
                        value={line.productName}
                        onChange={(e) => {
                          updateLine(line.id, 'productName', e.target.value)
                          setActiveSearchLine(line.id)
                        }}
                        onFocus={() => setActiveSearchLine(line.id)}
                        className="h-9 shadow-none border-transparent hover:border-slate-200 focus:border-[#e05d38] focus:ring-1 focus:ring-[#e05d38] bg-transparent cursor-text"
                      />
                      {/* Dropdown Menu */}
                      {activeSearchLine === line.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveSearchLine(null)}
                          />
                          <div className="absolute top-11 left-2 w-[calc(100%-1rem)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto py-1">
                            {MOCK_PRODUCTS.filter((p) =>
                              p.name.toLowerCase().includes(line.productName.toLowerCase())
                            ).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => selectProduct(line.id, p)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 transition-colors flex justify-between cursor-pointer"
                              >
                                <span>{p.name}</span>
                                <span className="text-slate-500 font-mono text-xs">
                                  {currencySymbol}
                                  {p.price}
                                </span>
                              </button>
                            ))}
                            {MOCK_PRODUCTS.filter((p) =>
                              p.name.toLowerCase().includes(line.productName.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                No products found.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min="1"
                        value={line.qty}
                        onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                        className="h-9 shadow-none text-center bg-transparent border-slate-200 dark:border-slate-800 px-1"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="relative flex items-center">
                        <select
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                          className="h-9 w-full appearance-none bg-transparent border border-slate-200 dark:border-slate-800 rounded-md text-center text-xs text-slate-600 dark:text-slate-300 pl-2 pr-5 outline-none cursor-pointer focus:border-[#e05d38]"
                        >
                          <option value="ea">ea</option>
                          <option value="hr">hr</option>
                          <option value="pc">pc</option>
                          <option value="mo">mo</option>
                          <option value="kg">kg</option>
                          <option value="box">box</option>
                          <option value="set">set</option>
                          <option value="lump">lump</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          onFocus={(e) => e.target.select()}
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                          className="h-9 pl-6 shadow-none text-right bg-transparent border-slate-200 dark:border-slate-800 font-mono px-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex h-9 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden bg-transparent focus-within:ring-1 focus-within:ring-[#e05d38]">
                        <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800">
                          <select
                            value={line.discountType}
                            onChange={(e) => updateLine(line.id, 'discountType', e.target.value)}
                            className="appearance-none bg-transparent text-xs font-semibold pl-2.5 pr-5 h-full outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <option value="Cash">{currencySymbol}</option>
                            <option value="Rate">%</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                        </div>
                        <Input
                          type="number"
                          onFocus={(e) => e.target.select()}
                          min="0"
                          value={line.discountValue}
                          onChange={(e) =>
                            updateLine(line.id, 'discountValue', Number(e.target.value))
                          }
                          className="h-full border-none shadow-none text-right rounded-none flex-1 min-w-0 px-1.5 font-mono text-sm bg-transparent"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-right font-mono font-medium text-slate-800 dark:text-slate-200 pr-4">
                      {currencySymbol}{' '}
                      {calculateLineTotal(line).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <button
                        onClick={() => removeLine(line.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={addLine}
                className="text-[#e05d38] hover:text-[#c94f2d] hover:bg-orange-50 dark:hover:bg-orange-950/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Row
              </Button>
            </div>
          </div>

          {/* Bottom Controls (Type, Note & Summary) */}
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-8">
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Type
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                  <button
                    onClick={() => setInvoiceType('Debt')}
                    className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                      invoiceType === 'Debt'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    On Credit (Debt)
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceType('Paid')
                      if (payments.length === 0) addPayment()
                    }}
                    className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                      invoiceType === 'Paid'
                        ? 'bg-[#e05d38] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Paid Now
                  </button>
                </div>
                <p className="text-xs text-slate-500 w-72 leading-relaxed pt-1">
                  {invoiceType === 'Debt'
                    ? 'The customer owes this amount and will pay later. It goes to Accounts Receivable.'
                    : 'The customer is paying immediately. A payment card is open on the right to capture funds.'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mt-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Note / Remarks
                </label>
                <textarea
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  placeholder="Add any special notes or terms here..."
                  className="w-full max-w-lg min-h-[90px] rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-xs outline-none focus:ring-1 focus:ring-[#e05d38] resize-y"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs w-[340px] shrink-0 space-y-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>
                  {currencySymbol}{' '}
                  {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm text-slate-500 items-center">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden bg-transparent w-28 focus-within:ring-1 focus-within:ring-[#e05d38]">
                    <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800">
                      <select
                        value={globalDiscountType}
                        onChange={(e) => setGlobalDiscountType(e.target.value as 'Cash' | 'Rate')}
                        className="appearance-none bg-transparent text-xs font-semibold pl-2.5 pr-5 h-full outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <option value="Cash">{currencySymbol}</option>
                        <option value="Rate">%</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                    </div>
                    <Input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min="0"
                      value={globalDiscountValue}
                      onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                      className="h-full border-none shadow-none text-right rounded-none flex-1 min-w-0 px-2 font-mono text-sm bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {globalDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount Amount</span>
                  <span>
                    - {currencySymbol}{' '}
                    {globalDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax (0%)</span>
                <span>{currencySymbol} 0.00</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Total Amount
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {currencySymbol}{' '}
                  {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PAYMENT CARD (Always visible, grayed if Debt) */}
        <div
          className={`w-96 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col max-h-full transition-all duration-300 ${invoiceType === 'Debt' ? 'opacity-50 grayscale pointer-events-none' : ''}`}
        >
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#e05d38]" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Payment Allocation</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-slate-500">Invoice Total:</span>
              <span className="font-bold text-lg">
                {currencySymbol}{' '}
                {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-4">
              {payments.map((payment, i) => (
                <div
                  key={payment.id}
                  className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 bg-slate-50 dark:bg-slate-800/30"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase">
                      Payment {i + 1}
                    </h4>
                    <button
                      onClick={() => removePayment(payment.id)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          onFocus={(e) => e.target.select()}
                          value={payment.amount}
                          onChange={(e) =>
                            updatePayment(payment.id, 'amount', Number(e.target.value))
                          }
                          className="h-8 pl-7 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Method
                      </label>
                      <select
                        value={payment.method}
                        onChange={(e) => updatePayment(payment.id, 'method', e.target.value)}
                        className="flex h-8 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-sm shadow-xs cursor-pointer"
                      >
                        <option>Cash</option>
                        <option>Bank Transfer</option>
                        <option>Card</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Moneybox / Account
                      </label>
                      <select
                        value={payment.moneyboxId}
                        onChange={(e) => updatePayment(payment.id, 'moneyboxId', e.target.value)}
                        className="flex h-8 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-sm shadow-xs cursor-pointer"
                      >
                        {MOCK_MONEYBOXES.map((box) => (
                          <option key={box.id} value={box.id}>
                            {box.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addPayment}
              className="w-full mt-2 gap-1.5 border-dashed border-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Payment Split
            </Button>
          </div>

          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-slate-600 dark:text-slate-400">Total Paid:</span>
              <span
                className={
                  payments.reduce((sum, p) => sum + p.amount, 0) < finalTotal
                    ? 'text-orange-500'
                    : 'text-green-600'
                }
              >
                {currencySymbol}{' '}
                {payments
                  .reduce((sum, p) => sum + p.amount, 0)
                  .toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
