import React, { useState } from 'react'
import { BriefcaseBusiness, Package, PackageSearch, Plus, ReceiptText, Trash2 } from 'lucide-react'
import type { FieldArrayWithId, FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
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
import type { Business, Currency } from '@/features/business'
import {
  convertBasePriceToUnitPrice,
  convertUnitPriceToBasePrice,
  productUnitOptions,
} from '@/features/inventory'
import type { Product, StockBalance } from '@/features/inventory'
import { cn } from '@/lib/utils'
import { AddSalesItemModal } from './AddSalesItemModal'
import { SalesItemCombobox } from './SalesItemCombobox'
import type { SalesItemOption } from './SalesItemCombobox'
import { SalesLineType } from '../types/sales.types'
import type {
  SalesCatalogItem,
  SalesInvoice,
  SalesInvoiceFormValues,
  SalesInvoiceLineForm,
  SalesLineType as SalesLineTypeValue,
  Service,
} from '../types/sales.types'

export interface SalesInvoiceItemsTableProps {
  isReadOnly: boolean
  invoice?: SalesInvoice | null
  // Form bindings for editable mode:
  fields?: FieldArrayWithId<SalesInvoiceFormValues, 'lines', 'id'>[]
  lines?: (Partial<SalesInvoiceLineForm> | undefined)[]
  register?: UseFormRegister<SalesInvoiceFormValues>
  setValue?: UseFormSetValue<SalesInvoiceFormValues>
  errors?: FieldErrors<SalesInvoiceFormValues>
  onAddLine?: () => void
  onAddService?: () => void
  onAddProduct?: () => void
  onRemoveLine?: (index: number) => void
  onChangeLineType?: (index: number, lineType: SalesLineTypeValue) => void
  onAddMultipleItems?: (items: SalesItemOption[]) => void
  isAddModalOpen?: boolean
  onAddModalOpenChange?: (open: boolean) => void
  // Lookups & context:
  catalogItems?: SalesCatalogItem[]
  selectableServices?: Service[]
  selectableProducts?: Product[]
  selectedCurrency?: Currency
  business?: Business | null
  isForeign?: boolean
  rate?: number
  balances?: StockBalance[]
  warehouseId?: string
  // Computed financial totals:
  subtotal?: number
  baseTotal?: number
}

export function SalesInvoiceItemsTable({
  isReadOnly,
  invoice,
  fields = [],
  lines = [],
  register,
  setValue,
  errors,
  onAddLine,
  onAddService,
  onAddProduct,
  onRemoveLine,
  onAddMultipleItems,
  isAddModalOpen: externalIsAddModalOpen,
  onAddModalOpenChange: externalOnAddModalOpenChange,
  catalogItems,
  selectableServices = [],
  selectableProducts = [],
  selectedCurrency,
  business,
  isForeign = false,
  rate = 1,
  subtotal = 0,
  baseTotal = 0,
}: SalesInvoiceItemsTableProps) {
  const [internalAddModalOpen, setInternalAddModalOpen] = useState(false)
  const isAddModalOpen = externalIsAddModalOpen ?? internalAddModalOpen
  const setAddModalOpen = externalOnAddModalOpenChange ?? setInternalAddModalOpen

  const itemCount = isReadOnly ? (invoice?.lines ?? []).length : fields.length

  return (
    <>
      <Card className="overflow-hidden py-0 gap-0 border border-border/80 shadow-xs">
        {/* CARD HEADER - Crisp, compact padding without excessive vertical whitespace */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-3 px-5 [.border-b]:pb-3">
          <div className="flex items-center gap-2.5">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Invoice Items</CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(true)}
                className="gap-1.5 text-xs font-medium"
              >
                <PackageSearch className="size-3.5 text-primary" />
                Add items
              </Button>
              {onAddLine ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddLine}
                  className="gap-1.5 text-xs font-medium"
                >
                  <Plus className="size-3.5 text-primary" />
                  Add line
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddService}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <BriefcaseBusiness className="size-3.5 text-primary" />
                    Add service
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddProduct}
                    className="gap-1.5 text-xs font-medium"
                  >
                    <Package className="size-3.5 text-primary" />
                    Add product
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>

      {/* TABLE CONTENT */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px] w-full border-collapse">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40">
                <TableHead className="w-12 px-3 py-2.5 text-center">#</TableHead>
                <TableHead className="min-w-[240px] px-3 py-2.5 text-left">Item</TableHead>
                <TableHead className="min-w-[180px] px-3 py-2.5 text-left">Description</TableHead>
                <TableHead className="w-28 px-3 py-2.5 text-left">Unit</TableHead>
                <TableHead className="w-24 px-3 py-2.5 text-right">Qty</TableHead>
                <TableHead className="w-32 px-3 py-2.5 text-right">Unit Price</TableHead>
                <TableHead className="w-32 px-3 py-2.5 text-right">Total</TableHead>
                {!isReadOnly && <TableHead className="w-12 px-3 py-2.5 text-center" />}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {isReadOnly ? (
                // READ-ONLY PRESENTATION
                (invoice?.lines ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No items recorded on this invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice?.lines.map((line, index) => {
                    const isService = line.lineType === SalesLineType.Service
                    const itemName = isService ? line.serviceName : line.productName
                    const displayName = !isService && line.sku ? `${itemName} (${line.sku})` : itemName

                    return (
                      <TableRow key={line.id} className="align-middle hover:bg-muted/25 transition-colors">
                        {/* Index */}
                        <TableCell className="px-3 py-2 text-center">
                          <div className="flex h-9 items-center justify-center font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </div>
                        </TableCell>

                        {/* Item */}
                        <TableCell className="px-3 py-2 text-left">
                          <div className="flex h-9 items-center font-medium text-foreground text-xs">
                            {displayName}
                          </div>
                        </TableCell>

                        {/* Description */}
                        <TableCell className="px-3 py-2 text-left">
                          <div className="flex h-9 items-center text-xs text-muted-foreground truncate">
                            {line.description || '—'}
                          </div>
                        </TableCell>

                        {/* Unit */}
                        <TableCell className="px-3 py-2 text-left">
                          <div className="flex h-9 items-center text-xs font-mono text-muted-foreground">
                            {line.unitCode ?? '—'}
                          </div>
                        </TableCell>

                        {/* Qty */}
                        <TableCell className="px-3 py-2 text-right">
                          <div className="flex h-9 items-center justify-end font-mono text-xs font-medium text-foreground">
                            {formatAmount(line.quantity)}
                          </div>
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell className="px-3 py-2 text-right">
                          <div className="flex h-9 items-center justify-end font-mono text-xs text-foreground">
                            {formatMoney(line.unitPrice, selectedCurrency?.decimalPlaces)} {invoice.currencyCode}
                          </div>
                        </TableCell>

                        {/* Total */}
                        <TableCell className="px-3 py-2 text-right">
                          <div className="flex h-9 items-center justify-end font-mono text-xs font-bold text-foreground">
                            {formatMoney(line.lineAmount, selectedCurrency?.decimalPlaces)} {invoice.currencyCode}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )
              ) : (
                // EDITABLE SPREADSHEET PRESENTATION
                fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <ReceiptText className="size-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-sm">No items added yet</p>
                          <p className="text-xs text-muted-foreground">
                            Click 'Add line' above to start building this invoice.
                          </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="gap-1.5 text-xs shadow-xs"
                            onClick={() => setAddModalOpen(true)}
                          >
                            <PackageSearch className="size-3.5" />
                            Add items
                          </Button>
                          {onAddLine ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={onAddLine}
                            >
                              <Plus className="size-3.5" />
                              Add line
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={onAddService}
                              >
                                <BriefcaseBusiness className="size-3.5" />
                                Add Service
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={onAddProduct}
                              >
                                <Package className="size-3.5" />
                                Add Product
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((field, index) => {
                    const line = lines?.[index]
                    const isService = line?.lineType === SalesLineType.Service
                    const selectedProduct = selectableProducts.find((item) => item.id === line?.productId)
                    const unitOptions = productUnitOptions(selectedProduct)
                    const invoiceLine = invoice?.lines?.[index]
                    const selectedItemId = line?.itemId || (isService ? line?.serviceId : line?.productId) || ''

                    if (line?.unitOfMeasureId && !unitOptions.some((unit) => unit.id === line.unitOfMeasureId)) {
                      unitOptions.push({
                        id: line.unitOfMeasureId,
                        name: invoiceLine?.unitCode ?? 'Unavailable unit',
                        code: invoiceLine?.unitCode ?? '—',
                        operation: invoiceLine?.conversionOperation ?? null,
                        factor: invoiceLine?.conversionFactor ?? 1,
                      })
                    }

                    const selectedUnitPriceBase = Number(line?.unitPriceBase) || 0
                    const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0)

                    const unitRegistration = register?.(`lines.${index}.unitOfMeasureId`)
                    const priceRegistration = register?.(`lines.${index}.unitPrice`, { valueAsNumber: true })

                    const itemError =
                      errors?.lines?.[index]?.itemId?.message ??
                      (isService
                        ? errors?.lines?.[index]?.serviceId?.message
                        : errors?.lines?.[index]?.productId?.message)
                    const qtyError = errors?.lines?.[index]?.quantity?.message
                    const priceError = errors?.lines?.[index]?.unitPrice?.message
                    const itemDisplayName = isService
                      ? invoiceLine?.serviceName ?? ''
                      : invoiceLine?.productName
                        ? `${invoiceLine.productName}${invoiceLine.sku ? ` (${invoiceLine.sku})` : ''}`
                        : ''

                    return (
                      <TableRow key={field.id} className="align-middle hover:bg-muted/20 transition-colors">
                        {/* Index */}
                        <TableCell className="px-3 py-2 text-center">
                          <div className="flex h-9 items-center justify-center font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </div>
                        </TableCell>

                        {/* Item Combobox Auto-Suggestion */}
                        <TableCell className="px-3 py-2 text-left">
                          <SalesItemCombobox
                            value={selectedItemId}
                            displayName={itemDisplayName}
                            lineType={line?.lineType}
                            items={catalogItems}
                            services={selectableServices}
                            products={selectableProducts}
                            rate={rate}
                            currencyCode={selectedCurrency?.code ?? ''}
                            currencyDecimals={selectedCurrency?.decimalPlaces ?? 2}
                            error={itemError}
                            aria-label={isService ? `Service for line ${index + 1}` : `Product for line ${index + 1}`}
                            onSelect={(item: SalesItemOption) => {
                              if (!setValue) return
                              setValue(`lines.${index}.itemId`, item.id, { shouldDirty: true })
                              if (item.type === SalesLineType.Service) {
                                setValue(`lines.${index}.lineType`, SalesLineType.Service, { shouldDirty: true })
                                setValue(`lines.${index}.serviceId`, item.id, { shouldDirty: true, shouldValidate: true })
                                setValue(`lines.${index}.productId`, '', { shouldDirty: true })
                                setValue(`lines.${index}.unitOfMeasureId`, '', { shouldDirty: true })
                                setValue(`lines.${index}.unitPriceBase`, item.basePrice, { shouldDirty: true })
                                setValue(`lines.${index}.useMasterPrice`, true, { shouldDirty: true })
                                setValue(
                                  `lines.${index}.unitPrice`,
                                  rate > 0 ? round6(item.basePrice / rate) : 0,
                                  { shouldDirty: true, shouldValidate: true }
                                )
                              } else {
                                setValue(`lines.${index}.lineType`, SalesLineType.Product, { shouldDirty: true })
                                setValue(`lines.${index}.productId`, item.id, { shouldDirty: true, shouldValidate: true })
                                setValue(`lines.${index}.serviceId`, '', { shouldDirty: true })
                                setValue(`lines.${index}.unitOfMeasureId`, item.unitOfMeasureId ?? '', {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                                setValue(`lines.${index}.unitPriceBase`, item.basePrice, { shouldDirty: true })
                                setValue(`lines.${index}.useMasterPrice`, true, { shouldDirty: true })
                                setValue(
                                  `lines.${index}.unitPrice`,
                                  rate > 0 ? round6(item.basePrice / rate) : 0,
                                  { shouldDirty: true, shouldValidate: true }
                                )
                              }
                            }}
                            onClear={() => {
                              if (!setValue) return
                              setValue(`lines.${index}.itemId`, '', { shouldDirty: true })
                              setValue(`lines.${index}.serviceId`, '', { shouldDirty: true, shouldValidate: true })
                              setValue(`lines.${index}.productId`, '', { shouldDirty: true, shouldValidate: true })
                              setValue(`lines.${index}.unitOfMeasureId`, '', { shouldDirty: true })
                              setValue(`lines.${index}.unitPriceBase`, 0, { shouldDirty: true })
                              setValue(`lines.${index}.unitPrice`, 0, { shouldDirty: true, shouldValidate: true })
                            }}
                          />
                        </TableCell>

                        {/* Description */}
                        <TableCell className="px-3 py-2 text-left">
                          <Input
                            placeholder="Optional description"
                            {...register?.(`lines.${index}.description`)}
                            className="h-9 text-xs"
                          />
                        </TableCell>

                        {/* Unit */}
                        <TableCell className="px-3 py-2 text-left">
                          {isService ? (
                            <div className="flex h-9 items-center px-2 text-xs text-muted-foreground font-mono select-none">
                              —
                            </div>
                          ) : (
                            <Select
                              aria-label={`Unit for line ${index + 1}`}
                              {...unitRegistration}
                              disabled={!selectedProduct}
                              onChange={(event) => {
                                const currentBaseUnitPrice =
                                  selectedProduct && line?.unitOfMeasureId
                                    ? convertUnitPriceToBasePrice(
                                        selectedProduct,
                                        line.unitOfMeasureId,
                                        selectedUnitPriceBase
                                      )
                                    : null
                                unitRegistration?.onChange(event)
                                if (!setValue) return
                                const nextBasePrice =
                                  selectedProduct && currentBaseUnitPrice !== null
                                    ? convertBasePriceToUnitPrice(
                                        selectedProduct,
                                        event.target.value,
                                        currentBaseUnitPrice
                                      )
                                    : null
                                if (nextBasePrice !== null) {
                                  setValue(`lines.${index}.unitPriceBase`, round6(nextBasePrice), {
                                    shouldDirty: true,
                                  })
                                  setValue(
                                    `lines.${index}.unitPrice`,
                                    rate > 0 ? round6(nextBasePrice / rate) : 0,
                                    { shouldDirty: true, shouldValidate: true }
                                  )
                                }
                              }}
                              className="h-9 text-xs"
                            >
                              <option value="">Select unit</option>
                              {unitOptions.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.code} — {unit.name}
                                </option>
                              ))}
                            </Select>
                          )}
                        </TableCell>

                        {/* Quantity */}
                        <TableCell className="px-3 py-2 text-right">
                          <Input
                            aria-label={`Quantity for line ${index + 1}`}
                            title={qtyError}
                            className={cn(
                              'h-9 text-right font-mono text-xs',
                              qtyError && 'border-destructive focus:border-destructive'
                            )}
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            {...register?.(`lines.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell className="px-3 py-2 text-right">
                          <Input
                            aria-label={`Unit price for line ${index + 1}`}
                            title={priceError}
                            className={cn(
                              'h-9 text-right font-mono text-xs',
                              priceError && 'border-destructive focus:border-destructive'
                            )}
                            type="number"
                            min="0"
                            step="0.000001"
                            disabled={isForeign && rate <= 0}
                            {...priceRegistration}
                            onChange={(event) => {
                              priceRegistration?.onChange(event)
                              if (!setValue) return
                              const transactionPrice = Number(event.target.value) || 0
                              setValue(`lines.${index}.unitPriceBase`, round6(transactionPrice * rate), {
                                shouldDirty: true,
                              })
                              setValue(`lines.${index}.useMasterPrice`, false, { shouldDirty: true })
                            }}
                          />
                        </TableCell>

                        {/* Total */}
                        <TableCell className="px-3 py-2 text-right">
                          <div className="flex h-9 items-center justify-end font-mono text-xs font-bold text-foreground">
                            {formatMoney(lineTotal, selectedCurrency?.decimalPlaces)}{' '}
                            {selectedCurrency?.code ?? ''}
                          </div>
                        </TableCell>

                        {/* Remove Button */}
                        <TableCell className="px-3 py-2 text-center">
                          <div className="flex h-9 items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Remove line ${index + 1}`}
                              onClick={() => onRemoveLine?.(index)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )
              )}
            </TableBody>
          </Table>
        </div>

        {/* INLINE ROOT LINE ERRORS */}
        {errors?.lines?.root?.message && (
          <p className="border-t border-destructive/20 bg-destructive/5 px-5 py-2 text-xs text-destructive">
            {errors.lines.root.message}
          </p>
        )}

        {/* TOTALS SUMMARY FOOTER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border bg-muted/20 px-5 py-3.5">
          <div className="text-xs text-muted-foreground">
            {isReadOnly ? (
              <span>
                Document currency:{' '}
                <strong className="font-mono text-foreground font-semibold">{invoice?.currencyCode}</strong>
              </span>
            ) : (
              <span>
                Active currency:{' '}
                <strong className="font-mono text-foreground font-semibold">
                  {selectedCurrency?.code ?? '—'}
                </strong>
                {isForeign && rate > 0 && (
                  <span className="ml-2 font-mono text-[11px]">
                    (1 {selectedCurrency?.code} = {formatAmount(rate)} {business?.baseCurrencyCode})
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-1.5">
            <SummaryRow
              label="Subtotal"
              value={
                isReadOnly
                  ? `${formatMoney(invoice?.subtotal, selectedCurrency?.decimalPlaces)} ${invoice?.currencyCode ?? ''}`
                  : `${formatMoney(subtotal, selectedCurrency?.decimalPlaces)} ${selectedCurrency?.code ?? ''}`
              }
            />
            {isForeign && (
              <SummaryRow
                label={`Base Total (${business?.baseCurrencyCode})`}
                value={
                  isReadOnly
                    ? `${formatMoney(invoice?.baseTotal, business?.baseCurrencyDecimalPlaces)} ${business?.baseCurrencyCode ?? ''}`
                    : `${formatMoney(baseTotal, business?.baseCurrencyDecimalPlaces)} ${business?.baseCurrencyCode ?? ''}`
                }
              />
            )}
            <div className="mt-1.5 flex w-full items-baseline justify-between gap-8 border-t border-border/60 pt-2 text-sm font-bold text-foreground">
              <span>Grand Total</span>
              <span className="font-mono text-base text-primary">
                {isReadOnly
                  ? `${formatMoney(invoice?.total, selectedCurrency?.decimalPlaces)} ${invoice?.currencyCode ?? ''}`
                  : `${formatMoney(subtotal, selectedCurrency?.decimalPlaces)} ${selectedCurrency?.code ?? ''}`}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {!isReadOnly && (
      <AddSalesItemModal
        open={isAddModalOpen}
        onOpenChange={setAddModalOpen}
        onAddItems={(selectedItems) => onAddMultipleItems?.(selectedItems)}
        items={catalogItems}
        services={selectableServices}
        products={selectableProducts}
        rate={rate}
        currencyCode={selectedCurrency?.code ?? ''}
        currencyDecimals={selectedCurrency?.decimalPlaces ?? 2}
      />
    )}
  </>
  )
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground shadow-2xs outline-none transition-colors hover:border-input focus:border-ring focus:ring-1 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-6 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  )
}

const round6 = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
const formatAmount = (value: number | null | undefined) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatMoney = (value: number | null | undefined, decimals = 4) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
