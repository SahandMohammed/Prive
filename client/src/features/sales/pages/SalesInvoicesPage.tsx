import { useState, useMemo } from 'react'
import { InvoiceType, ContactType } from '@/features/finance'
import type { ContactDto, InvoiceDto } from '@/features/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Calendar, 
  SlidersHorizontal, 
  Settings, 
  Folder, 
  FileText, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'

// --- Extended type to hold paidAmount and status for demo ---
interface ExtendedInvoiceDto extends InvoiceDto {
  paidAmount: number
  status: 'Open Invoice' | 'Draft' | 'Overdue' | 'Paid'
  invoiceCode: string
  createdDateTimeStr: string
  dueDateStr: string
}

// --- Mock Data for local demonstration ---
const MOCK_CUSTOMERS: ContactDto[] = [
  { id: "cust-1", name: "DEVOTEAM", type: ContactType.Customer, accountId: "acc-ar-1", isActive: true },
  { id: "cust-2", name: "ASIACELL TELECOM", type: ContactType.Customer, accountId: "acc-ar-2", isActive: true },
  { id: "cust-3", name: "ZAIN IRAQ", type: ContactType.Customer, accountId: "acc-ar-3", isActive: true },
  { id: "cust-4", name: "KOREK TELECOM", type: ContactType.Customer, accountId: "acc-ar-4", isActive: true },
  { id: "cust-5", name: "SULAYMANIYAH IT", type: ContactType.Customer, accountId: "acc-ar-5", isActive: true }
]

const INITIAL_MOCK_INVOICES: ExtendedInvoiceDto[] = [
  {
    id: "inv-001",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Open Invoice",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-1", description: "Cloud Infrastructure Setup", accountId: "acc-rev-1", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-002",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Draft",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-2", description: "System Audit & Analysis", accountId: "acc-rev-2", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-003",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Overdue",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-3", description: "Database Migration Service", accountId: "acc-rev-1", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-004",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Draft",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-4", description: "Custom Plugin Development", accountId: "acc-rev-3", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-005",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Open Invoice",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-5", description: "Annual Enterprise License", accountId: "acc-rev-3", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-006",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Draft",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-6", description: "Network Security Review", accountId: "acc-rev-2", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-007",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Overdue",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-7", description: "UI/UX Design Renewal", accountId: "acc-rev-1", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-008",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Draft",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-8", description: "API Integration Support", accountId: "acc-rev-2", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-009",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Overdue",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-9", description: "Staff Training Workshop", accountId: "acc-rev-2", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-010",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Draft",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-10", description: "Backup & Recovery Test", accountId: "acc-rev-3", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-011",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 0,
    status: "Open Invoice",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-11", description: "Monthly SaaS Tier", accountId: "acc-rev-3", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  },
  {
    id: "inv-012",
    invoiceCode: "F - 012023-68",
    type: InvoiceType.SalesInvoice,
    contactId: "cust-1",
    totalAmount: 876.39,
    paidAmount: 876.39,
    status: "Paid",
    currencyId: "curr-usd",
    exchangeRate: 1,
    invoiceDateUtc: "2023-01-17T10:00:00Z",
    createdDateTimeStr: "17 Jan 2023, Wed 1 : 20pm",
    dueDateStr: "03 Mar 2023",
    lines: [{ id: "l-12", description: "Paid Consulting Hour", accountId: "acc-rev-2", quantity: 1, unitPrice: 876.39, totalPrice: 876.39 }]
  }
]

export function SalesInvoicesPage() {
  // State for active metric tab filter
  const [activeTab, setActiveTab] = useState<'All' | 'Draft' | 'Open Invoice' | 'Overdue' | 'Paid'>('All')

  // Search & Filters
  const [search, setSearch] = useState('')
  const [dateRangeStr] = useState('1/1/2023 - 12/31/2023')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Selection states (for table checkboxes)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Header column popover filters & sorting
  const [activeFilterHeader, setActiveFilterHeader] = useState<'customer' | 'currency' | 'status' | null>(null)
  const [headerCustomerFilter, setHeaderCustomerFilter] = useState('')
  const [headerStatusFilter, setHeaderStatusFilter] = useState('')
  const [sortField, setSortField] = useState<'customer' | 'code' | 'amount' | 'date' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Invoices list state
  const [invoices] = useState<ExtendedInvoiceDto[]>(INITIAL_MOCK_INVOICES)

  // Filtered dataset
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Metric Tab filter
      if (activeTab === 'Draft' && inv.status !== 'Draft') return false
      if (activeTab === 'Open Invoice' && inv.status !== 'Open Invoice') return false
      if (activeTab === 'Overdue' && inv.status !== 'Overdue') return false
      if (activeTab === 'Paid' && inv.status !== 'Paid') return false

      // Column specific header filters
      if (headerCustomerFilter && inv.contactId !== headerCustomerFilter) return false
      if (headerStatusFilter && inv.status !== headerStatusFilter) return false

      // Search lower
      if (search.trim()) {
        const query = search.toLowerCase()
        const client = MOCK_CUSTOMERS.find(c => c.id === inv.contactId)
        const clientName = client?.name.toLowerCase() || ''
        const code = inv.invoiceCode.toLowerCase()
        const matchDesc = inv.lines.some(l => l.description.toLowerCase().includes(query))
        if (!clientName.includes(query) && !code.includes(query) && !matchDesc) return false
      }

      return true
    })
  }, [invoices, activeTab, headerCustomerFilter, headerStatusFilter, search])

  // Sorted dataset
  const sortedInvoices = useMemo(() => {
    if (!sortField) return filteredInvoices

    return [...filteredInvoices].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      if (sortField === 'customer') {
        const cA = MOCK_CUSTOMERS.find(c => c.id === a.contactId)?.name || ''
        const cB = MOCK_CUSTOMERS.find(c => c.id === b.contactId)?.name || ''
        valA = cA.toLowerCase()
        valB = cB.toLowerCase()
      } else if (sortField === 'code') {
        valA = a.invoiceCode.toLowerCase()
        valB = b.invoiceCode.toLowerCase()
      } else if (sortField === 'amount') {
        valA = a.totalAmount
        valB = b.totalAmount
      } else if (sortField === 'date') {
        valA = new Date(a.invoiceDateUtc).getTime()
        valB = new Date(b.invoiceDateUtc).getTime()
      } else if (sortField === 'status') {
        valA = a.status
        valB = b.status
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredInvoices, sortField, sortDirection])

  // Pagination slice
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedInvoices.slice(start, start + pageSize)
  }, [sortedInvoices, page, pageSize])

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1

  // Selection handlers
  const isAllSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedIds.includes(inv.id))
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedInvoices.map(inv => inv.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleSort = (field: 'customer' | 'code' | 'amount' | 'date' | 'status') => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Status Badge Class Renderer matching image pills
  const getStatusBadge = (status: ExtendedInvoiceDto['status']) => {
    switch (status) {
      case "Open Invoice":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f3ebfc] text-[#8e44ad]">
            Open Invoice
          </span>
        )
      case "Draft":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f1f3f5] text-[#6c757d]">
            Draft
          </span>
        )
      case "Overdue":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fde8e8] text-[#e03131]">
            Overdue
          </span>
        )
      case "Paid":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6fcf5] text-[#0ca678]">
            Paid
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col space-y-6 w-full h-full">
      {/* Overlay to close floating popover filters */}
      {activeFilterHeader && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setActiveFilterHeader(null)} 
        />
      )}

      {/* 1. TOP HEADER & ACTIONS ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Invoice</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium gap-2 shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Export
          </Button>

          <Button 
            variant="outline" 
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-sm font-medium gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Import
          </Button>

          <Link to="/sales/invoices/new">
            <Button className="bg-[#e05d38] hover:bg-[#c94f2d] text-white text-sm font-medium gap-1.5 shadow-sm px-4">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. SUMMARY METRIC TAB CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* All Invoice Card */}
        <div 
          onClick={() => { setActiveTab('All'); setPage(1); }}
          className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs relative ${
            activeTab === 'All' 
              ? 'border-[#e05d38] ring-1 ring-[#e05d38]' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <Folder className="w-4 h-4 text-slate-500" />
              <span>All Invoice <span className="text-[#e05d38] font-bold">(70)</span></span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">$466.2k</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              20.9%
            </span>
          </div>
        </div>

        {/* Draft Card */}
        <div 
          onClick={() => { setActiveTab('Draft'); setPage(1); }}
          className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs relative ${
            activeTab === 'Draft' 
              ? 'border-[#e05d38] ring-1 ring-[#e05d38]' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Draft <span className="text-[#e05d38] font-bold">(16)</span></span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">$500</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              <TrendingDown className="w-3 h-3" />
              5.9%
            </span>
          </div>
        </div>

        {/* Open Invoice Card */}
        <div 
          onClick={() => { setActiveTab('Open Invoice'); setPage(1); }}
          className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs relative ${
            activeTab === 'Open Invoice' 
              ? 'border-[#e05d38] ring-1 ring-[#e05d38]' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <AlertCircle className="w-4 h-4 text-purple-500" />
              <span>Open Invoice <span className="text-[#e05d38] font-bold">(25)</span></span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">$134.4k</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              20.9%
            </span>
          </div>
        </div>

        {/* Overdue Card */}
        <div 
          onClick={() => { setActiveTab('Overdue'); setPage(1); }}
          className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs relative ${
            activeTab === 'Overdue' 
              ? 'border-[#e05d38] ring-1 ring-[#e05d38]' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Overdue <span className="text-[#e05d38] font-bold">(34)</span></span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">$800</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              60.2%
            </span>
          </div>
        </div>

        {/* Paid Card */}
        <div 
          onClick={() => { setActiveTab('Paid'); setPage(1); }}
          className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs relative ${
            activeTab === 'Paid' 
              ? 'border-[#e05d38] ring-1 ring-[#e05d38]' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Paid <span className="text-[#e05d38] font-bold">(16)</span></span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">$0.00</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
              <TrendingDown className="w-3 h-3" />
              5.9%
            </span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR ROW (SEARCH, DATE PICKER, MORE FILTERS, SETTINGS) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search"
            className="pl-9 pr-10 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ⌘K
          </span>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Date Picker Range Button */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{dateRangeStr}</span>
          </div>

          {/* More Filters */}
          <Button 
            variant="outline" 
            size="default" 
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium gap-2 shadow-2xs h-10"
            onClick={() => {
              setHeaderCustomerFilter('')
              setHeaderStatusFilter('')
              setSearch('')
              setPage(1)
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            More filters
          </Button>

          {/* Settings Icon */}
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs h-10 w-10 shrink-0"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* 4. TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#e9ecef]/60 dark:bg-slate-800/60 hover:bg-[#e9ecef]/60 dark:hover:bg-slate-800/60 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-800">
                <TableHead className="w-10 px-4">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected} 
                    onChange={toggleSelectAll} 
                    className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38] cursor-pointer"
                  />
                </TableHead>
                <TableHead 
                  className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => handleSort('customer')}
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                      Customer
                      {sortField === 'customer' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveFilterHeader(activeFilterHeader === 'customer' ? null : 'customer')
                      }}
                      className={`p-1 rounded hover:bg-slate-200/60 ${headerCustomerFilter ? 'text-[#e05d38]' : 'text-slate-400'}`}
                    >
                      <Filter className="w-3 h-3" />
                    </button>

                    {activeFilterHeader === 'customer' && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-8 left-0 z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1.5 font-normal normal-case cursor-default"
                      >
                        <p className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                          Filter Customer
                        </p>
                        <button
                          onClick={() => { setHeaderCustomerFilter(''); setActiveFilterHeader(null); }}
                          className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 mt-1 cursor-pointer"
                        >
                          <span>All Customers</span>
                          {!headerCustomerFilter && <Check className="w-3 h-3 text-[#e05d38]" />}
                        </button>
                        {MOCK_CUSTOMERS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setHeaderCustomerFilter(c.id); setActiveFilterHeader(null); }}
                            className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <span>{c.name}</span>
                            {headerCustomerFilter === c.id && <Check className="w-3 h-3 text-[#e05d38]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Invoice
                    {sortField === 'code' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </TableHead>
                <TableHead 
                  className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => handleSort('status')}
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                      Status
                      {sortField === 'status' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveFilterHeader(activeFilterHeader === 'status' ? null : 'status')
                      }}
                      className={`p-1 rounded hover:bg-slate-200/60 ${headerStatusFilter ? 'text-[#e05d38]' : 'text-slate-400'}`}
                    >
                      <Filter className="w-3 h-3" />
                    </button>

                    {activeFilterHeader === 'status' && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-8 left-0 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1.5 font-normal normal-case cursor-default"
                      >
                        <p className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                          Filter Status
                        </p>
                        <button
                          onClick={() => { setHeaderStatusFilter(''); setActiveFilterHeader(null); }}
                          className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 mt-1 cursor-pointer"
                        >
                          <span>All Statuses</span>
                          {!headerStatusFilter && <Check className="w-3 h-3 text-[#e05d38]" />}
                        </button>
                        {['Open Invoice', 'Draft', 'Overdue', 'Paid'].map(s => (
                          <button
                            key={s}
                            onClick={() => { setHeaderStatusFilter(s); setActiveFilterHeader(null); }}
                            className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <span>{s}</span>
                            {headerStatusFilter === s && <Check className="w-3 h-3 text-[#e05d38]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Amount
                    {sortField === 'amount' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Issue Date</TableHead>
                <TableHead 
                  className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Created
                    {sortField === 'date' 
                      ? <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      : <span className="text-transparent group-hover:text-slate-400">↓</span>}
                  </div>
                </TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Due Date</TableHead>
                <TableHead className="px-4">•••</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => {
                  const client = MOCK_CUSTOMERS.find(c => c.id === inv.contactId)
                  const isChecked = selectedIds.includes(inv.id)
                  return (
                    <TableRow 
                      key={inv.id}
                      className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''
                      }`}
                    >
                      <TableCell className="px-4 py-3.5">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleSelectRow(inv.id)}
                          className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38] cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {client?.name || inv.contactId}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-slate-500 font-mono">
                        {inv.invoiceCode}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        $ {inv.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-slate-500">
                        17 Jan 2023
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-slate-500">
                        {inv.createdDateTimeStr}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-slate-500">
                        {inv.dueDateStr}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-slate-400">
                        <button className="hover:text-slate-600 p-1 rounded cursor-pointer">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    No invoices match your selected filter criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 5. FOOTER PAGINATION ROW */}
      <div className="flex items-center justify-end gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page:</span>
          <select 
            className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs px-2 shadow-2xs outline-none focus:border-slate-300"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Page navigation controls */}
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs cursor-pointer"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* ... numbers ... */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPage(p)}
              className={`h-8 w-8 p-0 text-xs font-semibold rounded-lg cursor-pointer ${
                p === page 
                  ? 'bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs'
              }`}
            >
              {p}
            </Button>
          ))}

          <Button 
            variant="outline" 
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs cursor-pointer"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
