import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { useAccountTree } from '@/features/accounting'
import { useCurrentUser } from '@/features/auth'
import { useBranches, useCurrencies } from '@/features/business'
import { useUsers } from '@/features/users'
import { moneyAccountSchema } from '../schemas/finance.schema'
import { MoneyAccountAccessLevel, MoneyAccountType } from '../types/finance.types'
import type { MoneyAccount, MoneyAccountInput } from '../types/finance.types'
import {
  useMoneyAccountAccess,
  useMoneyAccounts,
  useOpeningBalance,
  useReplaceMoneyAccountAccess,
  useSaveMoneyAccount,
} from '../hooks/useFinance'

type FormValue = Omit<MoneyAccountInput, 'notes' | 'bankName' | 'accountNumberOrIban'> & {
  notes: string
  bankName: string
  accountNumberOrIban: string
}
const empty: FormValue = {
  code: '',
  name: '',
  type: 0,
  branchId: '',
  currencyId: '',
  accountingAccountId: '',
  isActive: true,
  notes: '',
  bankName: '',
  accountNumberOrIban: '',
}

export function MoneyAccountsPage() {
  const current = useCurrentUser().data
  const management = Boolean(current && ['SuperAdmin', 'Manager'].includes(current.role))
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const query = useMoneyAccounts(
    { page: 1, pageSize: 100, search: search || undefined },
    management
  )
  const rows = query.data?.data ?? []
  const selected = rows.find((account) => account.id === selectedId)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Money Accounts</h1>
        <p className="text-sm text-muted-foreground">
          One cashbox or bank account per currency. Balances come only from posted Money Ledger
          movements.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Accessible accounts</CardTitle>
              <Input
                className="max-w-xs"
                placeholder="Search code or name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code / name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Linked GL</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <Message text="Loading accounts…" />
                ) : rows.length === 0 ? (
                  <Message text="No Money Accounts found." />
                ) : (
                  rows.map((account) => (
                    <TableRow
                      key={account.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(account.id)}
                    >
                      <TableCell>
                        <p className="font-mono font-semibold">{account.code}</p>
                        <p>{account.name}</p>
                      </TableCell>
                      <TableCell>{account.type === 0 ? 'Cashbox' : 'Bank'}</TableCell>
                      <TableCell>{account.branchName}</TableCell>
                      <TableCell>{account.currencyCode}</TableCell>
                      <TableCell>
                        {account.accountingAccountCode} — {account.accountingAccountName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {money(account.balance)} {account.currencyCode}
                      </TableCell>
                      <TableCell>
                        {account.currentUserAccess === 1
                          ? 'Operate'
                          : account.currentUserAccess === 0
                            ? 'View'
                            : management
                              ? 'Management only'
                              : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {management && (
          <MoneyAccountEditor
            key={selected?.id ?? 'new'}
            selected={selected}
            onClear={() => setSelectedId('')}
          />
        )}
      </div>
      {management && selectedId && <AccountAdministration accountId={selectedId} />}
    </div>
  )
}

function MoneyAccountEditor({
  selected,
  onClear,
}: {
  selected?: MoneyAccount
  onClear: () => void
}) {
  const branches = useBranches().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const accounts = useAccountTree({ classification: '0', postingAccountsOnly: true }).data ?? []
  const save = useSaveMoneyAccount(selected?.id)
  const form = useForm<FormValue>({
    resolver: zodResolver(moneyAccountSchema),
    defaultValues: selected
      ? {
          code: selected.code,
          name: selected.name,
          type: selected.type,
          branchId: selected.branchId,
          currencyId: selected.currencyId,
          accountingAccountId: selected.accountingAccountId,
          isActive: selected.isActive,
          notes: selected.notes ?? '',
          bankName: selected.bankName ?? '',
          accountNumberOrIban: selected.accountNumberOrIban ?? '',
        }
      : empty,
  })
  const type = useWatch({ control: form.control, name: 'type' })
  const submit = form.handleSubmit((value) =>
    save.mutate(
      {
        ...value,
        notes: clean(value.notes),
        bankName: type === MoneyAccountType.Bank ? clean(value.bankName) : null,
        accountNumberOrIban:
          type === MoneyAccountType.Bank ? clean(value.accountNumberOrIban) : null,
      },
      {
        onSuccess: () => {
          if (!selected) form.reset(empty)
        },
      }
    )
  )
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{selected ? 'Edit Money Account' : 'Register Money Account'}</CardTitle>
          {selected && (
            <Button variant="outline" size="sm" onClick={onClear}>
              New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Operational code">
            <Input {...form.register('code')} />
          </Field>
          <Field label="Name">
            <Input {...form.register('name')} />
          </Field>
          <Field label="Type">
            <Select {...form.register('type', { valueAsNumber: true })}>
              <option value="0">Cashbox</option>
              <option value="1">Bank</option>
            </Select>
          </Field>
          <Field label="Branch">
            <Select {...form.register('branchId')}>
              <option value="">Select branch</option>
              {branches
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Select {...form.register('currencyId')}>
              <option value="">Select currency</option>
              {currencies
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Posting Asset account">
            <Select {...form.register('accountingAccountId')}>
              <option value="">Select GL account</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </Select>
          </Field>
          {type === 1 && (
            <>
              <Field label="Bank name">
                <Input {...form.register('bankName')} />
              </Field>
              <Field label="Account / IBAN">
                <Input {...form.register('accountNumberOrIban')} />
              </Field>
            </>
          )}
          <Field label="Notes">
            <Input {...form.register('notes')} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} /> Active for new postings
          </label>
          {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
          <Button className="w-full" disabled={save.isPending}>
            {selected ? 'Save changes' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AccountAdministration({ accountId }: { accountId: string }) {
  const access = useMoneyAccountAccess(accountId)
  const users = useUsers(1, 100).data?.data ?? []
  const replace = useReplaceMoneyAccountAccess(accountId)
  const opening = useOpeningBalance(accountId)
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>User access</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              replace.mutate(
                users.flatMap((user) => {
                  const value = data.get(user.id)
                  return value === '' || value === null
                    ? []
                    : [{ userId: user.id, accessLevel: Number(value) as 0 | 1 }]
                })
              )
            }}
          >
            <div className="space-y-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded border p-2 text-sm"
                >
                  <span>{user.username}</span>
                  <Select
                    name={user.id}
                    key={`${user.id}-${access.data?.find((item) => item.userId === user.id)?.accessLevel ?? 'none'}`}
                    defaultValue={String(
                      access.data?.find((item) => item.userId === user.id)?.accessLevel ?? ''
                    )}
                  >
                    <option value="">No access</option>
                    <option value={MoneyAccountAccessLevel.View}>View</option>
                    <option value={MoneyAccountAccessLevel.Operate}>Operate</option>
                  </Select>
                </label>
              ))}
            </div>
            {replace.error && (
              <p className="mt-2 text-sm text-destructive">{replace.error.message}</p>
            )}
            <Button className="mt-3" disabled={replace.isPending}>
              Save access
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Opening balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Posts one auditable opening movement and Accounting journal. It is available only before
            the first ledger activity.
          </p>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              opening.mutate({
                date: new Date().toISOString().slice(0, 10),
                amount: Number(amount),
                exchangeRate: rate ? Number(rate) : null,
                notes: 'Opening Money Account balance',
              })
            }}
          >
            <Field label="Amount">
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
            <Field label="Exchange rate (foreign currency only)">
              <Input
                type="number"
                min="0.000001"
                step="0.000001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </Field>
            {opening.error && <p className="text-sm text-destructive">{opening.error.message}</p>}
            <Button disabled={opening.isPending}>Post opening balance</Button>
          </form>
        </CardContent>
      </Card>
    </div>
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
function Message({ text }: { text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  )
}
const clean = (value: string) => value.trim() || null
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
