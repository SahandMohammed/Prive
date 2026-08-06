import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateSupplier } from '../hooks/useSuppliers'
import { createSupplierSchema, type CreateSupplierFormValues } from '../schemas/suppliers.schemas'

interface CreateSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSupplierDialog({ open, onOpenChange }: CreateSupplierDialogProps) {
  const createSupplier = useCreateSupplier()
  const form = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: { name: '', phoneNumber: '', email: '', address: '', description: '', openingBalance: 0 },
  })

  const onSubmit = (values: CreateSupplierFormValues) => {
    createSupplier.mutate(
      {
        ...values,
        phoneNumber: values.phoneNumber || null,
        email: values.email || null,
        address: values.address || null,
        description: values.description || null,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create supplier</DialogTitle>
          <DialogDescription>Add the supplier information used for purchase invoices and Accounts Payable.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} autoFocus placeholder="Supplier name" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone number" error={form.formState.errors.phoneNumber?.message}>
              <Input {...form.register('phoneNumber')} type="tel" placeholder="+964 750 000 0000" />
            </FormField>
            <FormField label="Email" error={form.formState.errors.email?.message}>
              <Input {...form.register('email')} type="email" placeholder="name@example.com" />
            </FormField>
          </div>
          <FormField label="Address" error={form.formState.errors.address?.message}>
            <Textarea {...form.register('address')} placeholder="Street, city, country" />
          </FormField>
          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea {...form.register('description')} placeholder="Optional notes about this supplier" />
          </FormField>
          <FormField label="Opening balance" error={form.formState.errors.openingBalance?.message}>
            <Input {...form.register('openingBalance', { valueAsNumber: true })} type="number" min="0" step="0.01" />
          </FormField>
          {createSupplier.isError && <p className="text-sm text-red-600">{createSupplier.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createSupplier.isPending}>Cancel</Button>
            <Button type="submit" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={createSupplier.isPending}>
              {createSupplier.isPending ? 'Creating...' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
