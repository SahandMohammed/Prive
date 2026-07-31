import { useAccounts, useCreateAccount, useCurrencies } from '@/features/finance'
import { AccountCategory } from '@/features/finance'
import type { AccountDto, CurrencyDto } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function TreasuryPage() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: currencies } = useCurrencies()
  const createAccount = useCreateAccount()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [currencyId, setCurrencyId] = useState('')

  // Treasury accounts are usually under parent group "1100" (Cash & Bank)
  const treasuryGroup = accounts?.find((a: AccountDto) => a.code === '1100')
  const safes = accounts?.filter((a: AccountDto) => a.parentAccountId === treasuryGroup?.id || a.code.startsWith('1101'))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!treasuryGroup) return

    createAccount.mutate({
      code,
      name,
      category: AccountCategory.Asset,
      parentAccountId: treasuryGroup.id,
      currencyId: currencyId || null
    }, {
      onSuccess: () => {
        setName('')
        setCode('')
        setCurrencyId('')
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury (Safes & Banks)</h1>
        <p className="text-sm text-muted-foreground">Manage cash registers, safes, and bank accounts tracking liquidity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash Boxes & Safe Registry</CardTitle>
            <CardDescription>Liquid asset sub-ledgers and transaction boundaries.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading treasury boxes...</p>
            ) : safes && safes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Safe Name</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safes.map((safe: AccountDto) => {
                    const currency = currencies?.find((c: CurrencyDto) => c.id === safe.currencyId)
                    return (
                      <TableRow key={safe.id}>
                        <TableCell className="font-mono text-sm font-semibold">{safe.code}</TableCell>
                        <TableCell className="font-medium">{safe.name}</TableCell>
                        <TableCell>{currency?.code || 'Base Currency'}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          0.00
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No safes or bank accounts configured. Seed base accounts or create one now.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Register Box / Safe</CardTitle>
            <CardDescription>Add a new treasury asset account under Cash & Bank.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Account Code (e.g., 1102)</label>
                <Input value={code} onChange={e => setCode(e.target.value)} required placeholder="e.g. 1102" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Safe/Bank Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Al-Sulaymaniyah Cashier" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Restricted Currency (Optional)</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={currencyId} 
                  onChange={e => setCurrencyId(e.target.value)}
                >
                  <option value="">Base Currency (IQD)</option>
                  {currencies?.map((c: CurrencyDto) => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={createAccount.isPending}>
                Register Safe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
