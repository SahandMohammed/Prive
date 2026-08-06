import { useMemo, useState } from 'react'
import { AlertCircle, Mail, MoreHorizontal, Phone, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreateSupplierDialog } from '../components/CreateSupplierDialog'
import { useSuppliers } from '../hooks/useSuppliers'

export function SuppliersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const { data: suppliers = [], isLoading, isError } = useSuppliers()

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return suppliers

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.phoneNumber, supplier.email, supplier.address]
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [search, suppliers])

  const sortedSuppliers = useMemo(
    () => [...filteredSuppliers].sort((a, b) =>
      sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    ),
    [filteredSuppliers, sortDirection],
  )

  const totalPages = Math.max(1, Math.ceil(sortedSuppliers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedSuppliers = sortedSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const isAllSelected = paginatedSuppliers.length > 0 && paginatedSuppliers.every((supplier) => selectedIds.includes(supplier.id))

  const toggleAll = () => {
    setSelectedIds(isAllSelected ? [] : paginatedSuppliers.map((supplier) => supplier.id))
  }

  const toggleSupplier = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id])
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage suppliers used in purchase invoices.</p>
        </div>
        <Button className="gap-1.5 bg-[#e05d38] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c94f2d]" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create Supplier
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="Search suppliers"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <p className="text-sm text-slate-500">{filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? '' : 's'}</p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="w-10 px-4"><input type="checkbox" checked={isAllSelected} onChange={toggleAll} aria-label="Select all suppliers" className="cursor-pointer rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38]" /></TableHead>
                <TableHead className="cursor-pointer px-4 font-semibold text-slate-600 dark:text-slate-300" onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')}>
                  Supplier {sortDirection === 'asc' ? '↑' : '↓'}
                </TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Phone Number</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Email</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Address</TableHead>
                <TableHead className="px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Opening Balance</TableHead>
                <TableHead className="w-28 px-4 font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading && <LoadingRow />}
              {isError && !isLoading && <ErrorRow />}
              {!isLoading && !isError && paginatedSuppliers.length === 0 && <EmptyRow />}
              {!isLoading && !isError && paginatedSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4"><input type="checkbox" checked={selectedIds.includes(supplier.id)} onChange={() => toggleSupplier(supplier.id)} aria-label={`Select ${supplier.name}`} className="cursor-pointer rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38]" /></TableCell>
                  <TableCell className="px-4 py-3.5"><div className="font-medium text-slate-800 dark:text-slate-200">{supplier.name}</div>{supplier.description && <div className="max-w-xs truncate text-xs text-slate-500">{supplier.description}</div>}</TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{supplier.phoneNumber || '—'}</TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{supplier.email || '—'}</TableCell>
                  <TableCell className="max-w-56 truncate px-4 py-3.5 text-slate-600 dark:text-slate-300">{supplier.address || '—'}</TableCell>
                  <TableCell className="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">{supplier.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="px-4 py-3.5"><div className="flex items-center gap-1"><ActionLink href={supplier.phoneNumber ? `tel:${supplier.phoneNumber}` : undefined} label="Call supplier"><Phone className="h-4 w-4" /></ActionLink><ActionLink href={supplier.email ? `mailto:${supplier.email}` : undefined} label="Email supplier"><Mail className="h-4 w-4" /></ActionLink><Button variant="ghost" size="icon-sm" aria-label={`More actions for ${supplier.name}`}><MoreHorizontal className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination
        page={currentPage}
        pageSize={pageSize}
        totalItems={sortedSuppliers.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      <CreateSupplierDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}

function ActionLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  return <Button variant="ghost" size="icon-sm" render={href ? <a href={href} /> : undefined} disabled={!href} aria-label={label}>{children}</Button>
}
function LoadingRow() { return <TableRow><TableCell colSpan={7} className="h-48 text-center text-sm text-slate-500">Loading suppliers...</TableCell></TableRow> }
function ErrorRow() { return <TableRow><TableCell colSpan={7} className="h-48 text-center"><div className="flex flex-col items-center text-red-500"><AlertCircle className="mb-2 h-8 w-8" /><p className="text-sm font-medium">Failed to load suppliers</p></div></TableCell></TableRow> }
function EmptyRow() { return <TableRow><TableCell colSpan={7} className="h-48 text-center text-sm text-slate-500">No suppliers found.</TableCell></TableRow> }
