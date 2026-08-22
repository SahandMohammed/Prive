import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCurrencies } from '@/features/business'
import { useCurrentUser } from '@/features/auth'
import { exchangeRateSchema } from '../schemas/finance.schema'
import { useExchangeRateActions, useExchangeRates } from '../hooks/useFinance'
import type { ExchangeRateInput } from '../types/finance.types'

export function ExchangeRatesPage() {
  const current = useCurrentUser().data
  const admin = Boolean(current && ['SuperAdmin', 'Manager'].includes(current.role))
  const query = useExchangeRates({ page: 1, pageSize: 100 })
  const actions = useExchangeRateActions()
  const rows = query.data?.data ?? []
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Exchange Rates</h1>
        <p className="text-sm text-muted-foreground">
          Manual, effective-dated rates. Posted Finance documents preserve the exact historical rate
          they used.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Rate history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No Exchange Rates recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-mono">
                        {rate.fromCurrencyCode} → {rate.toCurrencyCode}
                      </TableCell>
                      <TableCell className="font-mono">
                        1 {rate.fromCurrencyCode} = {rate.rate.toLocaleString()}{' '}
                        {rate.toCurrencyCode}
                      </TableCell>
                      <TableCell>{new Date(rate.effectiveAtUtc).toLocaleString()}</TableCell>
                      <TableCell>{rate.createdByUsername}</TableCell>
                      <TableCell>{rate.isActive ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>
                        {admin && rate.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => actions.deactivate.mutate(rate.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {admin && <AddRateForm />}
      </div>
    </div>
  )
}

function AddRateForm() {
  const currencies = useCurrencies().data?.data ?? []
  const actions = useExchangeRateActions()
  const form = useForm<ExchangeRateInput>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: { fromCurrencyId: '', toCurrencyId: '', rate: 1, effectiveAtUtc: localNow() },
  })
  const submit = form.handleSubmit((value) =>
    actions.create.mutate(
      { ...value, effectiveAtUtc: new Date(value.effectiveAtUtc).toISOString() },
      { onSuccess: () => form.reset({ ...value, rate: 1, effectiveAtUtc: localNow() }) }
    )
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add rate</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="From currency">
            <Select {...form.register('fromCurrencyId')}>
              <option value="">Select</option>
              {currencies
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="To currency">
            <Select {...form.register('toCurrencyId')}>
              <option value="">Select</option>
              {currencies
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Rate">
            <Input
              type="number"
              min="0.000001"
              step="0.000001"
              {...form.register('rate', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Effective at">
            <Input type="datetime-local" {...form.register('effectiveAtUtc')} />
          </Field>
          {Object.values(form.formState.errors).map((error, index) => (
            <p key={index} className="text-xs text-destructive">
              {error.message}
            </p>
          ))}
          {actions.create.error && (
            <p className="text-sm text-destructive">{actions.create.error.message}</p>
          )}
          <Button className="w-full" disabled={actions.create.isPending}>
            Save rate
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} />
}
const localNow = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}
