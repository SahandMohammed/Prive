import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSaveCategory, useSaveSubcategory } from '../hooks/useInventory'
import { categorySchema, subcategorySchema } from '../schemas/inventory.schemas'
import type { Category, CategoryInput, Subcategory, SubcategoryInput } from '../types/inventory.types'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  onSaved?: (category: Category) => void
}

export function CategoryDialog({ open, onOpenChange, category, onSaved }: CategoryDialogProps) {
  const { t } = useTranslation(['inventory', 'common'])
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: categoryDefaults,
  })
  const save = useSaveCategory(category?.id ?? null)

  useEffect(() => {
    if (!open) return
    form.reset(category
      ? { name: category.name, isActive: category.isActive }
      : categoryDefaults)
  }, [category, form, open])

  const close = () => {
    save.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category
              ? t('inventory:categories.editCategory', { name: category.name })
              : t('inventory:categories.addCategory')}
          </DialogTitle>
          <DialogDescription>{t('inventory:categories.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => save.mutate(values, {
            onSuccess: (savedCategory) => {
              onSaved?.(savedCategory)
              close()
            },
          }))}
          className="space-y-4"
        >
          <DialogField label={t('inventory:categories.name')} error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} autoFocus />
          </DialogField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            {t('inventory:categories.active')}
          </label>
          {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{t('common:actions.cancel')}</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {category ? t('common:actions.save') : t('inventory:categories.addCategory')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SubcategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  subcategory?: Subcategory | null
  defaultCategoryId?: string
  onSaved?: (subcategory: Subcategory) => void
}

export function SubcategoryDialog({
  open,
  onOpenChange,
  categories,
  subcategory,
  defaultCategoryId = '',
  onSaved,
}: SubcategoryDialogProps) {
  const { t } = useTranslation(['inventory', 'common'])
  const form = useForm<SubcategoryInput>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: subcategoryDefaults,
  })
  const save = useSaveSubcategory(subcategory?.id ?? null)

  useEffect(() => {
    if (!open) return
    form.reset(subcategory
      ? { name: subcategory.name, categoryId: subcategory.categoryId, isActive: subcategory.isActive }
      : { ...subcategoryDefaults, categoryId: defaultCategoryId })
  }, [defaultCategoryId, form, open, subcategory])

  const close = () => {
    save.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {subcategory
              ? t('inventory:subcategories.editSubcategory', { name: subcategory.name })
              : t('inventory:subcategories.addSubcategory')}
          </DialogTitle>
          <DialogDescription>{t('inventory:subcategories.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => save.mutate(values, {
            onSuccess: (savedSubcategory) => {
              onSaved?.(savedSubcategory)
              close()
            },
          }))}
          className="space-y-4"
        >
          <DialogField label={t('inventory:subcategories.category')} error={form.formState.errors.categoryId?.message}>
            <select {...form.register('categoryId')} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">{t('inventory:subcategories.selectCategory')}</option>
              {categories
                .filter((item) => item.isActive || item.id === subcategory?.categoryId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{!item.isActive ? ` ${t('inventory:subcategories.inactiveSuffix')}` : ''}
                  </option>
                ))}
            </select>
          </DialogField>
          <DialogField label={t('inventory:subcategories.name')} error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} autoFocus />
          </DialogField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            {t('inventory:subcategories.active')}
          </label>
          {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{t('common:actions.cancel')}</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {subcategory ? t('common:actions.save') : t('inventory:subcategories.addSubcategory')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-start text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}

const categoryDefaults: CategoryInput = { name: '', isActive: true }
const subcategoryDefaults: SubcategoryInput = { name: '', categoryId: '', isActive: true }
