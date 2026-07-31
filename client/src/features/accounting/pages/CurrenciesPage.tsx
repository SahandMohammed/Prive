import { useCurrencies, useCreateCurrency } from '@/features/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export function CurrenciesPage() {
  const { data: currencies, isLoading } = useCurrencies()
  const createCurrency = useCreateCurrency()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [isBase, setIsBase] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createCurrency.mutate({
      code,
      name,
      symbol,
      exchangeRate: Number(exchangeRate),
      isBaseCurrency: isBase
    }, {
      onSuccess: () => {
        setCode('')
        setName('')
        setSymbol('')
        setExchangeRate('1')
        setIsBase(false)
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Currencies</h1>
        <p className="text-sm text-muted-foreground">Manage base reporting currency and transactional exchange rates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Supported Currencies</CardTitle>
            <CardDescription>Setup foreign currencies and input daily conversion values.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading Currencies...</p>
            ) : currencies && currencies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Exchange Rate (to Base)</TableHead>
                    <TableHead>Base Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm font-semibold">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="font-mono">{c.symbol || 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{c.exchangeRate.toFixed(4)}</TableCell>
                      <TableCell>
                        {c.isBaseCurrency ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No currencies defined. Add USD, IQD, or other currencies to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Currency</CardTitle>
            <CardDescription>Define a currency and its exchange multiplier.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Currency Code (e.g., IQD)</label>
                <Input value={code} onChange={e => setCode(e.target.value)} required placeholder="e.g., USD" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., US Dollar" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Symbol</label>
                <Input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g., $" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Exchange Rate (Base / Transaction)</label>
                <Input 
                  type="number" 
                  step="0.000001" 
                  value={exchangeRate} 
                  onChange={e => setExchangeRate(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isBase"
                  checked={isBase} 
                  onChange={e => setIsBase(e.target.checked)} 
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="isBase" className="text-sm select-none font-medium">Set as Base Currency</label>
              </div>

              <Button type="submit" className="w-full" disabled={createCurrency.isPending}>
                Create Currency
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
