import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronsDownUp, 
  ChevronsUpDown, 
  Edit3, 
  Folder, 
  FolderOpen, 
  FileText, 
  Loader2, 
  Plus, 
  Search, 
  Trash2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAccountTree, useDeleteAccount, useSaveAccount } from '../hooks/useAccounting'
import { accountSchema } from '../schemas/accounting.schemas'
import { accountClassificationLabels, type Account, type AccountInput } from '../types/accounting.types'

const emptyAccount: AccountInput = {
  code: '',
  name: '',
  classification: 0,
  parentAccountId: null,
  isGroup: false,
  isActive: true,
}

export function ChartOfAccountsPage() {
  const [search, setSearch] = useState('')
  const [classification, setClassification] = useState<string>('')
  const [editing, setEditing] = useState<Account | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const accountsQuery = useAccountTree({ search, classification: classification || undefined })
  const saveAccount = useSaveAccount(editing?.id ?? null)
  const deleteAccount = useDeleteAccount()
  const form = useForm<AccountInput>({ resolver: zodResolver(accountSchema), defaultValues: emptyAccount })
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])

  // Automatically expand all group accounts by default when data loads
  useEffect(() => {
    if (accounts.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          const groupIds = new Set(accounts.filter((a) => a.isGroup).map((a) => a.id))
          return groupIds
        }
        return prev
      })
    }
  }, [accounts])

  useEffect(() => {
    const source = editing ?? (parentId ? accounts.find((account) => account.id === parentId) : null)
    form.reset(
      source
        ? {
            code: editing?.code ?? '',
            name: editing?.name ?? '',
            classification: editing?.classification ?? source.classification,
            parentAccountId: editing?.parentAccountId ?? (editing ? null : source.id),
            isGroup: editing?.isGroup ?? false,
            isActive: editing?.isActive ?? true,
          }
        : emptyAccount
    )
  }, [accounts, editing, form, parentId])

  const roots = useMemo(
    () => accounts.filter((account) => !account.parentAccountId || !accounts.some((parent) => parent.id === account.parentAccountId)),
    [accounts]
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setEditing(null)
    setParentId(null)
    form.reset(emptyAccount)
  }

  const openCreateModal = () => {
    setEditing(null)
    setParentId(null)
    form.reset(emptyAccount)
    setIsModalOpen(true)
  }

  const openEditModal = (account: Account) => {
    setParentId(null)
    setEditing(account)
    setIsModalOpen(true)
  }

  const openChildModal = (account: Account) => {
    setEditing(null)
    setParentId(account.id)
    setIsModalOpen(true)
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    const allGroupIds = new Set(accounts.filter((a) => a.isGroup).map((a) => a.id))
    setExpandedIds(allGroupIds)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const save = form.handleSubmit((values) => {
    saveAccount.mutate(values, {
      onSuccess: (savedAccount) => {
        if (savedAccount?.parentAccountId) {
          setExpandedIds((prev) => new Set(prev).add(savedAccount.parentAccountId!))
        }
        closeModal()
      },
    })
  })

  const parentAccount = useMemo(() => {
    if (editing?.parentAccountId) return accounts.find((a) => a.id === editing.parentAccountId)
    if (parentId) return accounts.find((a) => a.id === parentId)
    return null
  }, [accounts, editing, parentId])

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            One shared, editable Iraqi IFRS-oriented chart of accounts.
          </p>
        </div>
        <Button className="gap-1.5 bg-[#e05d38] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c94f2d]" onClick={openCreateModal}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Add account
        </Button>
      </div>

      <Card className="w-full border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Account Hierarchy</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code or name"
                  className="h-9 rounded-lg border-slate-200 bg-white pl-8 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
              <select
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
                className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="">All classifications</option>
                {Object.entries(accountClassificationLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={expandAll} title="Expand all groups">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  Expand all
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={collapseAll} title="Collapse all groups">
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  Collapse all
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {accountsQuery.isPending ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#e05d38]" />
              <p className="text-sm">Loading chart of accounts...</p>
            </div>
          ) : accountsQuery.isError ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-red-500">
              <p className="text-sm font-medium">Could not load the Chart of Accounts.</p>
            </div>
          ) : roots.length ? (
            <div className="space-y-1">
              {roots.map((account) => (
                <AccountNode
                  key={account.id}
                  account={account}
                  accounts={accounts}
                  depth={0}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  onEdit={openEditModal}
                  onChild={openChildModal}
                  onDelete={(id) => {
                    if (window.confirm('Delete this unused account?')) deleteAccount.mutate(id)
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              No accounts match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Account (${editing.code})` : parentId ? `Add Child Account` : 'Add Account'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update account details, classification, or status.'
                : parentId
                ? `Create a child account under ${parentAccount?.code} — ${parentAccount?.name}.`
                : 'Create a new root or general ledger account.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            {parentAccount && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Parent Account:</span>{' '}
                <span className="font-mono">{parentAccount.code}</span> — {parentAccount.name} ({accountClassificationLabels[parentAccount.classification]})
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account Code" error={form.formState.errors.code?.message}>
                <Input placeholder="e.g. 1010" className="font-mono uppercase" {...form.register('code')} autoFocus />
              </Field>
              <Field label="Account Name" error={form.formState.errors.name?.message}>
                <Input placeholder="e.g. Cash on Hand" {...form.register('name')} />
              </Field>
            </div>

            <Field label="Classification" error={form.formState.errors.classification?.message}>
              <select
                {...form.register('classification', { valueAsNumber: true })}
                disabled={Boolean(parentId)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:disabled:bg-slate-800"
              >
                {Object.entries(accountClassificationLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38]" {...form.register('isGroup')} />
                <span>Group / Summary account</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" className="rounded border-slate-300 text-[#e05d38] focus:ring-[#e05d38]" {...form.register('isActive')} />
                <span>Active</span>
              </label>
            </div>

            {saveAccount.isError && (
              <p className="text-sm text-red-600">{saveAccount.error.message}</p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeModal} disabled={saveAccount.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={saveAccount.isPending}>
                {saveAccount.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {editing ? 'Save changes' : 'Create account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AccountNodeProps {
  account: Account
  accounts: Account[]
  depth: number
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (account: Account) => void
  onChild: (account: Account) => void
  onDelete: (id: string) => void
}

function AccountNode({
  account,
  accounts,
  depth,
  expandedIds,
  onToggleExpand,
  onEdit,
  onChild,
  onDelete,
}: AccountNodeProps) {
  const children = useMemo(() => accounts.filter((child) => child.parentAccountId === account.id), [accounts, account.id])
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(account.id)

  const classificationColor = getClassificationBadgeClass(account.classification)

  return (
    <div>
      <div
        className="group flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        style={{ paddingLeft: `${Math.max(8, depth * 22 + 8)}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand(account.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={isExpanded ? `Collapse ${account.name}` : `Expand ${account.name}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <div className="flex shrink-0 items-center text-slate-400">
            {account.isGroup ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-amber-500" />
              ) : (
                <Folder className="h-4 w-4 text-amber-500" />
              )
            ) : (
              <FileText className="h-4 w-4 text-slate-400" />
            )}
          </div>

          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {account.code}
          </span>

          <span className={`truncate text-sm ${account.isGroup ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-normal text-slate-700 dark:text-slate-300'}`}>
            {account.name}
          </span>

          <div className="hidden items-center gap-1.5 sm:flex">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${classificationColor}`}>
              {accountClassificationLabels[account.classification]}
            </span>
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${account.isGroup ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
              {account.isGroup ? 'Group' : 'Posting'}
            </span>
            {!account.isActive && (
              <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100">
          {account.isGroup && (
            <Button
              size="icon-sm"
              variant="ghost"
              className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Add child account"
              onClick={() => onChild(account)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="Edit account"
            onClick={() => onEdit(account)}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="h-7 w-7 text-slate-500 hover:text-red-600"
            title="Delete account"
            onClick={() => onDelete(account.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-slate-100 dark:border-slate-800/60" style={{ marginLeft: `${Math.max(16, depth * 22 + 16)}px` }}>
          {children.map((child) => (
            <AccountNode
              key={child.id}
              account={child}
              accounts={accounts}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onChild={onChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getClassificationBadgeClass(classification: number): string {
  switch (classification) {
    case 0: // Asset
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 1: // Liability
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    case 2: // Equity
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
    case 3: // Revenue
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    case 4: // Expense
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
    case 5: // Contra Asset
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}
