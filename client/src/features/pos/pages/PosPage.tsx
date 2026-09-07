import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Banknote,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { convertBasePriceToUnitPrice, convertToBaseQuantity, productUnitOptions } from '@/features/inventory'
import type { UnitConvertibleProduct } from '@/features/inventory'
import { SalesLineType } from '@/features/sales'
import { cn } from '@/lib/utils'
import { useCompletePosSale, usePosCatalog, usePosCustomers, usePosSetup } from '../hooks/usePos'
import { posCheckoutSchema } from '../schemas/pos.schema'
import type { PosCheckoutValues } from '../schemas/pos.schema'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCatalogItem, PosSetup } from '../types/pos.types'

interface CartLine {
  item: PosCatalogItem
  quantity: number
  unitOfMeasureId: string
  unitPriceBase: number
  professionalUserId: string
}

export function PosPage() {
  const setupQuery = usePosSetup()
  const setup = setupQuery.data
  const [branchId, setBranchId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [itemType, setItemType] = useState<'' | PosCatalogItemType>('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const defaultBranchId =
    setup?.branches.find((item) => item.isMainBranch)?.id ?? setup?.branches[0]?.id ?? ''
  const selectedBranchId = branchId || defaultBranchId
  const defaultWarehouseId =
    setup?.warehouses.find((item) => item.branchId === selectedBranchId)?.id ?? ''
  const selectedWarehouseId = warehouseId || defaultWarehouseId

  const catalogQuery = usePosCatalog({
    page,
    pageSize: 24,
    search: deferredSearch.trim() || undefined,
    itemType: itemType === '' ? undefined : itemType,
    categoryId: categoryId || undefined,
    warehouseId: selectedWarehouseId || undefined,
  })
  const items = catalogQuery.data?.data ?? []
  const total = cart.reduce((sum, line) => sum + line.unitPriceBase * line.quantity, 0)
  const branchWarehouses =
    setup?.warehouses.filter((warehouse) => warehouse.branchId === selectedBranchId) ?? []
  const categories =
    setup?.categories.filter((category) => itemType === '' || category.itemType === itemType) ?? []

  const changeBranch = (value: string) => {
    setBranchId(value)
    setWarehouseId(setup?.warehouses.find((warehouse) => warehouse.branchId === value)?.id ?? '')
    setCart([])
    setPage(1)
  }
  const changeWarehouse = (value: string) => {
    setWarehouseId(value)
    setCart([])
    setPage(1)
  }
  const chooseType = (value: '' | PosCatalogItemType) => {
    setItemType(value)
    setCategoryId('')
    setPage(1)
  }
  const addItem = (item: PosCatalogItem) => {
    setCart((current) => {
      const existing = current.find(
        (line) => line.item.itemType === item.itemType && line.item.id === item.id
      )
      if (existing)
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line
        )
      return [...current, { item, quantity: 1, unitOfMeasureId: item.unitOfMeasureId ?? '', unitPriceBase: item.unitPriceBase, professionalUserId: '' }]
    })
  }
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0)
      setCart((current) => current.filter((_, currentIndex) => currentIndex !== index))
    else
      setCart((current) =>
        current.map((line, currentIndex) => (currentIndex === index ? { ...line, quantity } : line))
      )
  }

  if (setupQuery.isPending)
    return <div className="grid h-72 place-items-center text-muted-foreground">Loading POS…</div>
  if (setupQuery.isError || !setup)
    return (
      <p className="text-destructive">{setupQuery.error?.message ?? 'POS setup is unavailable.'}</p>
    )

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POS</h1>
          <p className="text-sm text-muted-foreground">
            Select services and products, collect payment, and complete the sale once.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Branch">
            <Select value={selectedBranchId} onChange={(event) => changeBranch(event.target.value)}>
              {setup.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} — {branch.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product warehouse">
            <Select
              value={selectedWarehouseId}
              onChange={(event) => changeWarehouse(event.target.value)}
            >
              <option value="">Select warehouse</option>
              {branchWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </header>

      <div className="grid min-h-[680px] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="min-w-0">
          <CardHeader className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search name, SKU, barcode, or category"
                className="h-11 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={itemType === ''} onClick={() => chooseType('')}>
                All
              </FilterButton>
              <FilterButton
                active={itemType === PosCatalogItemType.Service}
                onClick={() => chooseType(PosCatalogItemType.Service)}
              >
                <BriefcaseBusiness />
                Services
              </FilterButton>
              <FilterButton
                active={itemType === PosCatalogItemType.Product}
                onClick={() => chooseType(PosCatalogItemType.Product)}
              >
                <Package />
                Products
              </FilterButton>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterButton
                active={!categoryId}
                onClick={() => {
                  setCategoryId('')
                  setPage(1)
                }}
              >
                All categories
              </FilterButton>
              {categories.map((category) => (
                <FilterButton
                  key={`${category.itemType}-${category.id}`}
                  active={categoryId === category.id}
                  onClick={() => {
                    setItemType(category.itemType)
                    setCategoryId(category.id)
                    setPage(1)
                  }}
                >
                  {category.name}
                </FilterButton>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {catalogQuery.isPending ? (
              <div className="grid h-64 place-items-center text-muted-foreground">
                Loading catalog…
              </div>
            ) : catalogQuery.isError ? (
              <p className="text-destructive">{catalogQuery.error.message}</p>
            ) : items.length === 0 ? (
              <div className="grid h-64 place-items-center rounded-lg border border-dashed text-muted-foreground">
                No matching services or products.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((item) => {
                  const productUnavailable =
                    item.itemType === PosCatalogItemType.Product &&
                    (!selectedWarehouseId || (item.availableQuantity ?? 0) <= 0)
                  return (
                    <button
                      key={`${item.itemType}-${item.id}`}
                      type="button"
                      disabled={productUnavailable}
                      onClick={() => addItem(item)}
                      className="group min-h-36 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <ItemBadge type={item.itemType} />
                        <Plus className="size-5 text-muted-foreground transition group-hover:text-primary" />
                      </div>
                      <p className="mt-3 font-semibold leading-tight">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sku ? `${item.sku} · ` : ''}
                        {item.categoryName}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <span className="font-mono text-base font-bold">
                          {amount(item.unitPriceBase)} {setup.baseCurrencyCode}
                        </span>
                        {item.itemType === PosCatalogItemType.Product && (
                          <span
                            className={cn(
                              'text-xs',
                              (item.availableQuantity ?? 0) > 0
                                ? 'text-emerald-700'
                                : 'text-destructive'
                            )}
                          >
                            {amount(item.availableQuantity ?? 0)} in stock
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {catalogQuery.data?.meta.totalCount ?? 0} items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={!catalogQuery.data?.meta.hasPreviousPage}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-16 text-center">
                  {catalogQuery.data?.meta.page ?? page} /{' '}
                  {Math.max(catalogQuery.data?.meta.totalPages ?? 1, 1)}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={!catalogQuery.data?.meta.hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit xl:sticky xl:top-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Current cart{' '}
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">
                {cart.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="grid h-44 place-items-center rounded-lg border border-dashed px-8 text-center text-sm text-muted-foreground">
                Choose a Service or Product to begin.
              </div>
            ) : (
              <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {cart.map((line, index) => (
                  <div
                    key={`${line.item.itemType}-${line.item.id}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <ItemBadge type={line.item.itemType} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{line.item.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {amount(line.unitPriceBase)} × {line.quantity}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${line.item.name}`}
                        onClick={() => updateQuantity(index, 0)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {line.item.itemType === PosCatalogItemType.Service && (
                      <Select
                        className="mt-3 h-8"
                        value={line.professionalUserId}
                        onChange={(event) =>
                          setCart((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index
                                ? { ...item, professionalUserId: event.target.value }
                                : item
                            )
                          )
                        }
                      >
                        <option value="">No Professional assigned</option>
                        {setup.professionals.map((professional) => (
                          <option key={professional.id} value={professional.id}>
                            {professional.username}
                          </option>
                        ))}
                      </Select>
                    )}
                    {line.item.itemType === PosCatalogItemType.Product && (
                      <Select
                        className="mt-3 h-8"
                        value={line.unitOfMeasureId}
                        onChange={(event) => {
                          const product = asUnitProduct(line.item)
                          const unitPrice = convertBasePriceToUnitPrice(product, event.target.value, line.item.unitPriceBase)
                          if (unitPrice === null) return
                          setCart((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, unitOfMeasureId: event.target.value, unitPriceBase: round4(unitPrice) } : item))
                        }}
                      >
                        {productUnitOptions(asUnitProduct(line.item)).map((unit) => <option key={unit.id} value={unit.id}>{unit.code} — {unit.name}</option>)}
                      </Select>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => updateQuantity(index, line.quantity - 1)}
                        >
                          <Minus />
                        </Button>
                        <span className="min-w-8 text-center font-mono">{line.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => updateQuantity(index, line.quantity + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <span className="font-mono font-semibold">
                        {amount(line.unitPriceBase * line.quantity)}
                      </span>
                    </div>
                    {line.item.itemType === PosCatalogItemType.Product && <p className="mt-1 text-right text-xs text-muted-foreground">Base: {amount(convertToBaseQuantity(asUnitProduct(line.item), line.unitOfMeasureId, line.quantity) ?? 0)} {line.item.unitCode}</p>}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground">
                  {amount(total)} {setup.baseCurrencyCode}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="font-mono text-primary">
                  {amount(total)} {setup.baseCurrencyCode}
                </span>
              </div>
            </div>
            <Button
              className="h-12 w-full text-base"
              disabled={
                cart.length === 0 ||
                !selectedBranchId ||
                (cart.some((line) => line.item.itemType === PosCatalogItemType.Product) &&
                  !selectedWarehouseId)
              }
              onClick={() => setCheckoutOpen(true)}
            >
              <Banknote />
              Pay / Checkout
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Stock, rates, permissions, balances, and accounting are revalidated when you complete.
            </p>
          </CardContent>
        </Card>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        setup={setup}
        branchId={selectedBranchId}
        warehouseId={selectedWarehouseId}
        cart={cart}
        total={total}
      />
    </div>
  )
}

function CheckoutDialog({
  open,
  onOpenChange,
  setup,
  branchId,
  warehouseId,
  cart,
  total,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  setup: PosSetup
  branchId: string
  warehouseId: string
  cart: CartLine[]
  total: number
}) {
  const navigate = useNavigate()
  const complete = useCompletePosSale()
  const resetComplete = complete.reset
  const accounts = useMemo(
    () => setup.moneyAccounts.filter((account) => account.branchId === branchId),
    [branchId, setup.moneyAccounts]
  )
  const baseAccount = accounts.find(
    (account) => account.currencyId === setup.baseCurrencyId && account.currentExchangeRate === 1
  )
  const defaultAccount = baseAccount ?? accounts[0]
  const form = useForm<PosCheckoutValues>({
    resolver: zodResolver(posCheckoutSchema),
    defaultValues: {
      customerId: '',
      customerSearch: '',
      tenders: [{ moneyAccountId: '', amount: 0 }],
      changeMoneyAccountId: '',
      changeAmount: 0,
    },
  })
  const tenderFields = useFieldArray({ control: form.control, name: 'tenders' })
  const values = useWatch({ control: form.control })
  const deferredCustomerSearch = useDeferredValue(values.customerSearch ?? '')
  const customerQuery = usePosCustomers({
    page: 1,
    pageSize: 20,
    search: deferredCustomerSearch.trim() || undefined,
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      customerId: '',
      customerSearch: '',
      tenders: [
        {
          moneyAccountId: defaultAccount?.id ?? '',
          amount: defaultAccount?.currentExchangeRate
            ? round4(total / defaultAccount.currentExchangeRate)
            : 0,
        },
      ],
      changeMoneyAccountId: '',
      changeAmount: 0,
    })
    resetComplete()
  }, [defaultAccount, form, open, resetComplete, total])

  const tenderedBase = (values.tenders ?? []).reduce((sum, tender) => {
    const account = accounts.find((item) => item.id === tender?.moneyAccountId)
    return sum + (Number(tender?.amount) || 0) * (account?.currentExchangeRate ?? 0)
  }, 0)
  const remaining = round4(Math.max(total - tenderedBase, 0))
  const changeDue = round4(Math.max(tenderedBase - total, 0))
  const changeAccount = accounts.find((account) => account.id === values.changeMoneyAccountId)
  const changeBase = round4(
    (Number(values.changeAmount) || 0) * (changeAccount?.currentExchangeRate ?? 0)
  )
  const ready =
    remaining === 0 && (changeDue === 0 || (Boolean(changeAccount) && changeBase === changeDue))

  useEffect(() => {
    if (changeDue === 0) {
      form.setValue('changeAmount', 0)
      form.setValue('changeMoneyAccountId', '')
      return
    }
    if (!changeAccount?.currentExchangeRate) return
    form.setValue('changeAmount', round4(changeDue / changeAccount.currentExchangeRate), {
      shouldValidate: true,
    })
  }, [changeAccount, changeDue, form])

  const submit = form.handleSubmit((value) => {
    if (!ready) {
      form.setError('root', {
        message:
          remaining > 0
            ? `Collect ${amount(remaining)} ${setup.baseCurrencyCode} more.`
            : 'Record change that exactly resolves the excess tender.',
      })
      return
    }
    form.clearErrors('root')
    complete.mutate(
      {
        branchId,
        warehouseId: warehouseId || null,
        customerId: value.customerId || null,
        lines: cart.map((line) => ({
          lineType:
            line.item.itemType === PosCatalogItemType.Service
              ? SalesLineType.Service
              : SalesLineType.Product,
          serviceId: line.item.itemType === PosCatalogItemType.Service ? line.item.id : null,
          productId: line.item.itemType === PosCatalogItemType.Product ? line.item.id : null,
          unitOfMeasureId: line.item.itemType === PosCatalogItemType.Product ? line.unitOfMeasureId : null,
          quantity: line.quantity,
          professionalUserId: line.professionalUserId || null,
        })),
        tenders: value.tenders.map((tender) => ({
          moneyAccountId: tender.moneyAccountId,
          amount: tender.amount,
        })),
        change:
          changeDue > 0
            ? { moneyAccountId: value.changeMoneyAccountId, amount: value.changeAmount }
            : null,
      },
      {
        onSuccess: (sale) => {
          onOpenChange(false)
          navigate(`/pos/sales/${sale.id}`)
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Checkout · {amount(total)} {setup.baseCurrencyCode}
          </DialogTitle>
          <DialogDescription>
            Record exactly what the customer hands over. Add change separately when tender exceeds
            the sale.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Find customer (optional)">
              <Input placeholder="Name or phone" {...form.register('customerSearch')} />
            </Field>
            <Field label="Customer">
              <Select {...form.register('customerId')}>
                <option value="">Walk-in · no customer</option>
                {customerQuery.data?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.primaryPhoneNumber ? ` · ${customer.primaryPhoneNumber}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tender lines</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  tenderFields.append({
                    moneyAccountId: baseAccount?.id ?? accounts[0]?.id ?? '',
                    amount: 0,
                  })
                }
              >
                <Plus />
                Add tender
              </Button>
            </div>
            {tenderFields.fields.map((field, index) => {
              const account = accounts.find(
                (item) => item.id === values.tenders?.[index]?.moneyAccountId
              )
              const baseEquivalent = round4(
                (Number(values.tenders?.[index]?.amount) || 0) * (account?.currentExchangeRate ?? 0)
              )
              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_170px_auto]"
                >
                  <Field
                    label="Money Account"
                    error={form.formState.errors.tenders?.[index]?.moneyAccountId?.message}
                  >
                    <Select {...form.register(`tenders.${index}.moneyAccountId`)}>
                      <option value="">Select account</option>
                      {accounts.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={item.currentExchangeRate === null}
                        >
                          {item.code} — {item.name} · {item.currencyCode}
                          {item.currentExchangeRate === null ? ' · rate missing' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label={`Tendered ${account?.currencyCode ?? ''}`}
                    error={form.formState.errors.tenders?.[index]?.amount?.message}
                  >
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      {...form.register(`tenders.${index}.amount`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="self-end"
                    disabled={tenderFields.fields.length === 1}
                    onClick={() => tenderFields.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    {account
                      ? `${amount(Number(values.tenders?.[index]?.amount) || 0)} ${account.currencyCode} × ${account.currentExchangeRate ?? '—'} = ${amount(baseEquivalent)} ${setup.baseCurrencyCode}`
                      : 'Select an operable Money Account.'}
                  </p>
                </div>
              )
            })}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!baseAccount}
              onClick={() =>
                form.setValue(
                  'tenders',
                  [{ moneyAccountId: baseAccount?.id ?? '', amount: total }],
                  { shouldValidate: true }
                )
              }
            >
              Exact cash · {amount(total)} {setup.baseCurrencyCode}
            </Button>
          </div>
          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
            <Summary label="Sale total" value={`${amount(total)} ${setup.baseCurrencyCode}`} />
            <Summary label="Tendered" value={`${amount(tenderedBase)} ${setup.baseCurrencyCode}`} />
            <Summary
              label={remaining > 0 ? 'Remaining' : 'Change due'}
              value={`${amount(remaining > 0 ? remaining : changeDue)} ${setup.baseCurrencyCode}`}
              accent={remaining > 0 || changeDue > 0}
            />
          </div>
          {changeDue > 0 && (
            <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50/50 p-4 sm:grid-cols-2 dark:bg-amber-950/10">
              <Field label="Return change from">
                <Select {...form.register('changeMoneyAccountId')}>
                  <option value="">Select Money Account</option>
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                      disabled={account.currentExchangeRate === null}
                    >
                      {account.code} — {account.name} · balance {amount(account.balance)}{' '}
                      {account.currencyCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={`Physical change ${changeAccount?.currencyCode ?? ''}`}
                error={form.formState.errors.changeAmount?.message}
              >
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  {...form.register('changeAmount', { valueAsNumber: true })}
                />
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Base equivalent: {amount(changeBase)} {setup.baseCurrencyCode}. The account balance
                is checked again during completion.
              </p>
            </div>
          )}
          {(form.formState.errors.root?.message || complete.error) && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root?.message ?? complete.error?.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Back to cart
            </Button>
            <Button type="submit" className="min-w-40" disabled={!ready || complete.isPending}>
              {complete.isPending ? 'Completing…' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ItemBadge({ type }: { type: PosCatalogItemType }) {
  const service = type === PosCatalogItemType.Service
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold',
        service ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
      )}
    >
      {service ? <BriefcaseBusiness /> : <Package />}
      {service ? 'Service' : 'Product'}
    </span>
  )
}
function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      className="shrink-0"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid content-start gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}
function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('h-9 w-full rounded-md border bg-background px-3 text-sm', className)}
      {...props}
    />
  )
}
function Summary({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-lg font-bold', accent && 'text-primary')}>{value}</p>
    </div>
  )
}
const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000

function asUnitProduct(item: PosCatalogItem): UnitConvertibleProduct {
  return {
    unitOfMeasureId: item.unitOfMeasureId ?? '',
    unitName: item.unitName ?? '',
    unitCode: item.unitCode ?? '',
    unitConversions: item.unitConversions,
  }
}
