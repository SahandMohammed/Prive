import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrentBusiness } from '@/features/business'
import { useCategories, useProduct, useSaveProduct, useSubcategories, useUnits } from '../hooks/useInventory'
import { productSchema } from '../schemas/inventory.schemas'
import { UnitConversionOperation, type Category, type ProductInput, type Subcategory } from '../types/inventory.types'
import { Field } from './CategoriesPage'
import { CategoryDialog, SubcategoryDialog } from './DefinitionDialogs'

type ItemForm = Omit<ProductInput, 'barcode' | 'subcategoryId' | 'description' | 'imageReference'> & {
  barcode: string
  subcategoryId: string
  description: string
}

const defaults: ItemForm = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  subcategoryId: '',
  unitOfMeasureId: '',
  purpose: 0,
  purchasePriceBase: 0,
  sellingPriceBase: 0,
  trackInventory: true,
  isActive: true,
  description: '',
  unitConversions: [],
}

export function ItemEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = useProduct(id)
  const categories = useCategories().data?.data ?? []
  const units = useUnits().data?.data ?? []
  const business = useCurrentBusiness().data
  const save = useSaveProduct(id ?? null)
  const [categoryDialog, setCategoryDialog] = useState<Category | null | undefined>()
  const [subcategoryDialog, setSubcategoryDialog] = useState<Subcategory | null | undefined>()
  const form = useForm<ItemForm>({ resolver: zodResolver(productSchema), defaultValues: defaults })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const subcategoryId = useWatch({ control: form.control, name: 'subcategoryId' })
  const baseUnitId = useWatch({ control: form.control, name: 'unitOfMeasureId' })
  const conversions = useWatch({ control: form.control, name: 'unitConversions' })
  const subcategories = useSubcategories({ categoryId: categoryId || undefined }).data?.data ?? []
  const conversionFields = useFieldArray({ control: form.control, name: 'unitConversions' })

  useEffect(() => {
    if (!product.data) return
    form.reset({
      name: product.data.name,
      sku: product.data.sku,
      barcode: product.data.barcode ?? '',
      categoryId: product.data.categoryId,
      subcategoryId: product.data.subcategoryId ?? '',
      unitOfMeasureId: product.data.unitOfMeasureId,
      purpose: product.data.purpose,
      purchasePriceBase: product.data.purchasePriceBase,
      sellingPriceBase: product.data.sellingPriceBase,
      trackInventory: product.data.trackInventory,
      isActive: product.data.isActive,
      description: product.data.description ?? '',
      unitConversions: product.data.unitConversions.map(({ unitOfMeasureId, operation, factor }) => ({ unitOfMeasureId, operation, factor })),
    })
  }, [form, product.data])

  if (id && product.isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-muted-foreground" /></div>
  }

  const baseUnit = units.find((unit) => unit.id === baseUnitId)
  const selectedCategory = categories.find((category) => category.id === categoryId)
  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === subcategoryId)
  const currency = business?.baseCurrencySymbol ?? business?.baseCurrencyCode ?? 'Base currency'
  const submit = form.handleSubmit((values) => save.mutate({
    ...values,
    barcode: values.barcode.trim() || null,
    subcategoryId: values.subcategoryId || null,
    description: values.description.trim() || null,
    imageReference: product.data?.imageReference ?? null,
  }, { onSuccess: () => navigate('/settings/items') }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/settings/items" aria-label="Back to items"><Button variant="outline" size="icon"><ArrowLeft className="size-4" /></Button></Link>
          <div><h1 className="text-2xl font-bold tracking-tight">{id ? 'Edit item' : 'Create item'}</h1><p className="text-sm text-muted-foreground">Inventory quantities and costing always use the base unit.</p></div>
        </div>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save item</Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div><h2 className="font-semibold">Item details</h2><p className="text-sm text-muted-foreground">Classification and operational defaults for this inventory item.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field>
            <Field label="SKU" error={form.formState.errors.sku?.message}><Input className="uppercase" {...form.register('sku')} /></Field>
            <Field label="Barcode"><Input {...form.register('barcode')} /></Field>
            <Field label="Purpose" error={form.formState.errors.purpose?.message}><Select {...form.register('purpose', { valueAsNumber: true })}><option value={0}>Resale</option><option value={1}>Consumable</option><option value={2}>Both</option></Select></Field>
            <DefinitionSelectField
              label="Category"
              error={form.formState.errors.categoryId?.message}
              select={<Select {...form.register('categoryId', { onChange: () => form.setValue('subcategoryId', '') })}><option value="">Select category</option>{categories.filter((item) => item.isActive || item.id === product.data?.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select>}
              onAdd={() => setCategoryDialog(null)}
              onEdit={selectedCategory ? () => setCategoryDialog(selectedCategory) : undefined}
            />
            <DefinitionSelectField
              label="Subcategory"
              error={form.formState.errors.subcategoryId?.message}
              select={<Select {...form.register('subcategoryId')} disabled={!categoryId}><option value="">No subcategory</option>{subcategories.filter((item) => item.isActive || item.id === product.data?.subcategoryId).map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select>}
              onAdd={categoryId ? () => setSubcategoryDialog(null) : undefined}
              onEdit={selectedSubcategory ? () => setSubcategoryDialog(selectedSubcategory) : undefined}
            />
            <Field label="Base unit" error={form.formState.errors.unitOfMeasureId?.message}><Select {...form.register('unitOfMeasureId')}><option value="">Select base unit</option>{units.filter((item) => item.isActive || item.id === product.data?.unitOfMeasureId).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select><span className="text-xs font-normal text-muted-foreground">Cannot change after purchase, sale, or stock history exists.</span></Field>
            <Field label={`Purchase price (${currency})`} error={form.formState.errors.purchasePriceBase?.message}><Input type="number" min="0" step="0.0001" {...form.register('purchasePriceBase', { valueAsNumber: true })} /></Field>
            <Field label={`Selling price (${currency})`} error={form.formState.errors.sellingPriceBase?.message}><Input type="number" min="0" step="0.0001" {...form.register('sellingPriceBase', { valueAsNumber: true })} /></Field>
          </div>
          <Field label="Description" error={form.formState.errors.description?.message}><textarea {...form.register('description')} className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
          <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('trackInventory')} />Track inventory</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} />Active</label></div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h2 className="font-semibold">Unit conversions</h2><p className="text-sm text-muted-foreground">Conversions are item-specific and always resolve to {baseUnit?.name ?? 'the base unit'}.</p></div>
            <Button type="button" variant="outline" onClick={() => conversionFields.append({ unitOfMeasureId: '', operation: UnitConversionOperation.Multiply, factor: 1 })} disabled={!baseUnitId}><Plus className="size-4" />Add conversion</Button>
          </div>
          {conversionFields.fields.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No alternate units. Transactions use only the base unit.</p> : conversionFields.fields.map((field, index) => {
            const conversion = conversions[index]
            const unit = units.find((item) => item.id === conversion?.unitOfMeasureId)
            const factor = Number(conversion?.factor) || 0
            const equivalent = conversion?.operation === UnitConversionOperation.Divide && factor > 0 ? 1 / factor : factor
            return <div key={field.id} className="space-y-2 rounded-md border p-4"><div className="grid gap-3 md:grid-cols-[1fr_160px_1fr_auto]"><Field label="Unit" error={form.formState.errors.unitConversions?.[index]?.unitOfMeasureId?.message}><Select {...form.register(`unitConversions.${index}.unitOfMeasureId`)}><option value="">Select unit</option>{units.filter((item) => item.id !== baseUnitId && (item.isActive || item.id === unit?.id)).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field><Field label="Operation" error={form.formState.errors.unitConversions?.[index]?.operation?.message}><Select {...form.register(`unitConversions.${index}.operation`, { valueAsNumber: true })}><option value={UnitConversionOperation.Multiply}>Multiply</option><option value={UnitConversionOperation.Divide}>Divide</option></Select></Field><Field label="Factor" error={form.formState.errors.unitConversions?.[index]?.factor?.message}><Input type="number" min="0.000001" step="0.000001" {...form.register(`unitConversions.${index}.factor`, { valueAsNumber: true })} /></Field><Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => conversionFields.remove(index)} aria-label="Remove conversion"><Trash2 className="size-4" /></Button></div>{unit && baseUnit && factor > 0 && <p className="text-sm text-muted-foreground">1 {unit.name} equals <strong className="text-foreground">{equivalent.toLocaleString(undefined, { maximumFractionDigits: 6 })} {baseUnit.name}</strong>. Entered quantity is {conversion.operation === UnitConversionOperation.Multiply ? 'multiplied by' : 'divided by'} {factor.toLocaleString()}.</p>}</div>
          })}
          {form.formState.errors.unitConversions?.message && <p className="text-sm text-destructive">{form.formState.errors.unitConversions.message}</p>}
        </section>

        {product.isError && <p className="text-sm text-destructive">{product.error.message}</p>}
        {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
        <div className="flex justify-end gap-3"><Link to="/settings/items"><Button type="button" variant="outline">Cancel</Button></Link><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save item</Button></div>
      </form>
      <CategoryDialog
        open={categoryDialog !== undefined}
        onOpenChange={(open) => { if (!open) setCategoryDialog(undefined) }}
        category={categoryDialog}
        onSaved={(category) => {
          if (!category.isActive) {
            if (form.getValues('categoryId') === category.id) {
              form.setValue('categoryId', '', { shouldDirty: true, shouldValidate: true })
              form.setValue('subcategoryId', '', { shouldDirty: true })
            }
            return
          }
          if (form.getValues('categoryId') !== category.id) {
            form.setValue('subcategoryId', '', { shouldDirty: true })
          }
          form.setValue('categoryId', category.id, { shouldDirty: true, shouldValidate: true })
        }}
      />
      <SubcategoryDialog
        open={subcategoryDialog !== undefined}
        onOpenChange={(open) => { if (!open) setSubcategoryDialog(undefined) }}
        categories={categories}
        subcategory={subcategoryDialog}
        defaultCategoryId={categoryId}
        onSaved={(subcategory) => {
          if (!subcategory.isActive) {
            if (form.getValues('subcategoryId') === subcategory.id) {
              form.setValue('subcategoryId', '', { shouldDirty: true, shouldValidate: true })
            }
            return
          }
          form.setValue('categoryId', subcategory.categoryId, { shouldDirty: true, shouldValidate: true })
          form.setValue('subcategoryId', subcategory.id, { shouldDirty: true, shouldValidate: true })
        }}
      />
    </div>
  )
}

function DefinitionSelectField({ label, error, select, onAdd, onEdit }: { label: string; error?: string; select: React.ReactNode; onAdd?: () => void; onEdit?: () => void }) {
  return (
    <div className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      <div className="flex gap-2">
        {select}
        <Button type="button" variant="outline" size="icon" onClick={onAdd} disabled={!onAdd} aria-label={`Add ${label.toLowerCase()}`} title={`Add ${label.toLowerCase()}`}><Plus className="size-4" /></Button>
        <Button type="button" variant="outline" size="icon" onClick={onEdit} disabled={!onEdit} aria-label={`Edit selected ${label.toLowerCase()}`} title={`Edit selected ${label.toLowerCase()}`}><Pencil className="size-4" /></Button>
      </div>
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </div>
  )
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />
}
