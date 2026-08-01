import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, Search, SlidersHorizontal, Folder, Package, 
  Briefcase, MoreHorizontal, Filter, Check, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'

interface ItemDto {
  id: string
  code: string
  name: string
  type: 'Product' | 'Service'
  unit: string
  price: number
  isActive: boolean
}

const MOCK_ITEMS: ItemDto[] = [
  { id: 'i-1', code: 'PRD-001', name: 'Premium Consulting Hour', type: 'Service', unit: 'hr', price: 150, isActive: true },
  { id: 'i-2', code: 'PRD-002', name: 'Software License (Annual)', type: 'Product', unit: 'ea', price: 1200, isActive: true },
  { id: 'i-3', code: 'PRD-003', name: 'Hardware Setup Fee', type: 'Service', unit: 'lump', price: 500, isActive: true },
  { id: 'i-4', code: 'PRD-004', name: 'Monthly Retainer', type: 'Service', unit: 'mo', price: 3000, isActive: true },
  { id: 'i-5', code: 'PRD-005', name: 'Server Rack 42U', type: 'Product', unit: 'ea', price: 850, isActive: false },
]

export function ItemsPage() {
  const [activeTab, setActiveTab] = useState<'All' | 'Product' | 'Service'>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [activeFilterHeader, setActiveFilterHeader] = useState<'type' | 'status' | null>(null)
  const [headerTypeFilter, setHeaderTypeFilter] = useState('')
  const [headerStatusFilter, setHeaderStatusFilter] = useState('')
  
  const [sortField, setSortField] = useState<'name' | 'code' | 'type' | 'price' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [items] = useState<ItemDto[]>(MOCK_ITEMS)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'Product' && item.type !== 'Product') return false
      if (activeTab === 'Service' && item.type !== 'Service') return false

      if (headerTypeFilter && item.type !== headerTypeFilter) return false
      if (headerStatusFilter && (item.isActive ? 'Active' : 'Inactive') !== headerStatusFilter) return false

      if (search.trim()) {
        const query = search.toLowerCase()
        if (!item.name.toLowerCase().includes(query) && !item.code.toLowerCase().includes(query)) return false
      }

      return true
    })
  }, [items, activeTab, headerTypeFilter, headerStatusFilter, search])

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems
    return [...filteredItems].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''
      
      if (sortField === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase() }
      else if (sortField === 'code') { valA = a.code.toLowerCase(); valB = b.code.toLowerCase() }
      else if (sortField === 'type') { valA = a.type.toLowerCase(); valB = b.type.toLowerCase() }
      else if (sortField === 'price') { valA = a.price; valB = b.price }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredItems, sortField, sortDirection])

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [sortedItems, page, pageSize])

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.includes(i.id))
  
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([])
    else setSelectedIds(paginatedItems.map(i => i.id))
  }
  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id))
    else setSelectedIds([...selectedIds, id])
  }
  const handleSort = (field: 'name' | 'code' | 'type' | 'price') => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  return (
    <div className="flex flex-col space-y-6 w-full h-full">
      {activeFilterHeader && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveFilterHeader(null)} />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Items</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/settings/items/new">
            <Button className="bg-[#e05d38] hover:bg-[#c94f2d] text-white text-sm font-medium gap-1.5 shadow-sm px-4">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Create Item
            </Button>
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <div onClick={() => { setActiveTab('All'); setPage(1); }} className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs ${activeTab === 'All' ? 'border-[#e05d38] ring-1 ring-[#e05d38]' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
            <Folder className="w-4 h-4 text-slate-500" />
            <span>All Items <span className="text-[#e05d38] font-bold">({items.length})</span></span>
          </div>
        </div>
        <div onClick={() => { setActiveTab('Product'); setPage(1); }} className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs ${activeTab === 'Product' ? 'border-[#e05d38] ring-1 ring-[#e05d38]' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
            <Package className="w-4 h-4 text-blue-500" />
            <span>Products <span className="text-[#e05d38] font-bold">({items.filter(i => i.type === 'Product').length})</span></span>
          </div>
        </div>
        <div onClick={() => { setActiveTab('Service'); setPage(1); }} className={`bg-white dark:bg-slate-900 rounded-xl p-4 border transition-all cursor-pointer shadow-2xs ${activeTab === 'Service' ? 'border-[#e05d38] ring-1 ring-[#e05d38]' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
            <Briefcase className="w-4 h-4 text-purple-500" />
            <span>Services <span className="text-[#e05d38] font-bold">({items.filter(i => i.type === 'Service').length})</span></span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search Items" className="pl-9 pr-10 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button variant="outline" size="default" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium gap-2 shadow-2xs h-10" onClick={() => { setHeaderTypeFilter(''); setHeaderStatusFilter(''); setSearch(''); setPage(1); }}>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Clear Filters
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#e9ecef]/60 dark:bg-slate-800/60 hover:bg-[#e9ecef]/60 dark:hover:bg-slate-800/60 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-800">
                <TableHead className="w-10 px-4">
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38] cursor-pointer" />
                </TableHead>
                <TableHead className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Code {sortField === 'code' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </TableHead>
                <TableHead className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Name {sortField === 'name' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </TableHead>
                <TableHead className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => handleSort('type')}>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                      Type {sortField === 'type' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveFilterHeader(activeFilterHeader === 'type' ? null : 'type') }} className={`p-1 rounded hover:bg-slate-200/60 ${headerTypeFilter ? 'text-[#e05d38]' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                    {activeFilterHeader === 'type' && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute top-8 left-0 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1.5 font-normal normal-case cursor-default">
                        <button onClick={() => { setHeaderTypeFilter(''); setActiveFilterHeader(null); }} className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 mt-1 cursor-pointer">
                          <span>All Types</span>
                          {!headerTypeFilter && <Check className="w-3 h-3 text-[#e05d38]" />}
                        </button>
                        {['Product', 'Service'].map(t => (
                          <button key={t} onClick={() => { setHeaderTypeFilter(t); setActiveFilterHeader(null); }} className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                            <span>{t}</span>
                            {headerTypeFilter === t && <Check className="w-3 h-3 text-[#e05d38]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Unit</TableHead>
                <TableHead className="px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    Base Price {sortField === 'price' && <span className="text-[#e05d38]">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </TableHead>
                <TableHead className="px-4">
                  <div className="relative flex items-center justify-between">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Status</span>
                    <button onClick={(e) => { e.stopPropagation(); setActiveFilterHeader(activeFilterHeader === 'status' ? null : 'status') }} className={`p-1 rounded hover:bg-slate-200/60 ${headerStatusFilter ? 'text-[#e05d38]' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                    {activeFilterHeader === 'status' && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-md p-1.5 font-normal normal-case cursor-default">
                        <button onClick={() => { setHeaderStatusFilter(''); setActiveFilterHeader(null); }} className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 mt-1 cursor-pointer">
                          <span>All</span>
                          {!headerStatusFilter && <Check className="w-3 h-3 text-[#e05d38]" />}
                        </button>
                        {['Active', 'Inactive'].map(s => (
                          <button key={s} onClick={() => { setHeaderStatusFilter(s); setActiveFilterHeader(null); }} className="flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                            <span>{s}</span>
                            {headerStatusFilter === s && <Check className="w-3 h-3 text-[#e05d38]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead className="px-4">•••</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedItems.map((item) => {
                const isChecked = selectedIds.includes(item.id)
                return (
                  <TableRow key={item.id} className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isChecked ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
                    <TableCell className="px-4 py-3.5"><input type="checkbox" checked={isChecked} onChange={() => toggleSelectRow(item.id)} className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38] cursor-pointer" /></TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-slate-500">{item.code}</TableCell>
                    <TableCell className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">{item.name}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${item.type === 'Product' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-500">{item.unit}</TableCell>
                    <TableCell className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      {item.isActive 
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600">Active</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500">Inactive</span>
                      }
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-500"><button className="hover:text-slate-900 dark:hover:text-slate-100"><MoreHorizontal className="w-4 h-4" /></button></TableCell>
                  </TableRow>
                )
              })}
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
            className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs px-2 shadow-2xs outline-none focus:border-slate-300 cursor-pointer"
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="h-8 w-8 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
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
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
