import { useAccounts, useCreateAccount, useSeedAccounts } from '@/features/finance'
import { AccountCategory } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function ChartOfAccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const seedAccounts = useSeedAccounts()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState<AccountCategory>(AccountCategory.Asset)
  const [parentAccountId, setParentAccountId] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createAccount.mutate({
      code,
      name,
      category,
      parentAccountId: parentAccountId || null
    }, {
      onSuccess: () => {
        setName('')
        setCode('')
        setParentAccountId('')
      }
    })
  }

  const getCategoryLabel = (cat: AccountCategory) => {
    switch (cat) {
      case AccountCategory.Asset: return 'Asset'
      case AccountCategory.Liability: return 'Liability'
      case AccountCategory.Equity: return 'Equity'
      case AccountCategory.Revenue: return 'Revenue'
      case AccountCategory.Expense: return 'Expense'
      default: return 'Unknown'
    }
  }

  // Recursive render function to build tree
  const renderAccountTree = (parentId: string | null = null, depth = 0) => {
    if (!accounts) return null
    const levelAccounts = accounts.filter(a => a.parentAccountId === parentId)

    if (levelAccounts.length === 0) return null

    return (
      <div className="space-y-1">
        {levelAccounts.map(account => (
          <div key={account.id} className="space-y-1">
            <div 
              style={{ paddingLeft: `${depth * 1.5}rem` }} 
              className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors ${
                account.isLeaf ? 'bg-background border border-border/30' : 'font-semibold text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs bg-secondary px-2 py-0.5 rounded font-mono text-secondary-foreground">{account.code}</span>
                <span className="text-sm text-foreground">{account.name}</span>
                {!account.isLeaf && <span className="text-[10px] uppercase text-muted-foreground/50 border border-muted-foreground/30 px-1 rounded">Group</span>}
              </div>
              <div className="flex items-center gap-4 text-sm font-mono">
                <span className="text-muted-foreground">{getCategoryLabel(account.category)}</span>
                {account.isLeaf && (
                  <button 
                    onClick={() => {
                      setParentAccountId(account.id)
                      setCategory(account.category)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Add Sub-Account
                  </button>
                )}
              </div>
            </div>
            {renderAccountTree(account.id, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Hierarchy of all ledger accounts under IFRS standards.</p>
        </div>
        {accounts && accounts.length === 0 && (
          <Button onClick={() => seedAccounts.mutate()} disabled={seedAccounts.isPending}>
            Seed Default Chart of Accounts
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Accounts Tree</CardTitle>
            <CardDescription>Navigate structural groups and transaction accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading Chart of Accounts...</p>
            ) : accounts && accounts.length > 0 ? (
              <div className="space-y-3">{renderAccountTree(null)}</div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No accounts found. Use the seed button to generate default accounting structures.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Add a new structural or transactional account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Account Category</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={category} 
                  onChange={e => setCategory(Number(e.target.value) as AccountCategory)}
                  disabled={!!parentAccountId}
                >
                  <option value={AccountCategory.Asset}>Asset</option>
                  <option value={AccountCategory.Liability}>Liability</option>
                  <option value={AccountCategory.Equity}>Equity</option>
                  <option value={AccountCategory.Revenue}>Revenue</option>
                  <option value={AccountCategory.Expense}>Expense</option>
                </select>
              </div>

              {parentAccountId && (
                <div className="p-2 rounded bg-muted text-xs text-muted-foreground flex justify-between items-center">
                  <span>Parent: {accounts?.find(a => a.id === parentAccountId)?.name}</span>
                  <button type="button" onClick={() => setParentAccountId('')} className="text-destructive hover:underline">
                    Clear
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold">Code (e.g., 1102)</label>
                <Input value={code} onChange={e => setCode(e.target.value)} required placeholder="Account code" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Account Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Al-Mada Safe" />
              </div>

              <Button type="submit" className="w-full" disabled={createAccount.isPending}>
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
