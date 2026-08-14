import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { businessSchema, type BusinessFormValues } from '../schemas/business.schemas'
import { useCurrencies, useCurrentBusiness, useSaveBusiness } from '../hooks/useBusiness'
import type { BusinessInput } from '../types/business.types'

const emptyValues: BusinessFormValues = {
  name: '', legalName: '', primaryPhoneNumber: '', secondaryPhoneNumber: '',
  email: '', website: '', address: '', city: '', region: '', country: '',
  logoReference: '', baseCurrencyId: '', isSetupCompleted: true,
}

export function BusinessSettingsPage() {
  const businessQuery = useCurrentBusiness()
  const currenciesQuery = useCurrencies()
  const business = businessQuery.data
  const saveBusiness = useSaveBusiness(Boolean(business))
  const form = useForm<BusinessFormValues, unknown, BusinessInput>({ resolver: zodResolver(businessSchema), defaultValues: emptyValues })

  useEffect(() => {
    if (business) form.reset({ ...business, legalName: business.legalName ?? '', secondaryPhoneNumber: business.secondaryPhoneNumber ?? '', email: business.email ?? '', website: business.website ?? '', logoReference: business.logoReference ?? '' })
  }, [business, form])

  if (currenciesQuery.isLoading || businessQuery.isLoading) {
    return <LoadingState />
  }

  const currencies = currenciesQuery.data?.data ?? []
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{business ? 'Business profile' : 'Business setup'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business ? 'Manage the Prive Lounge business profile and base currency.' : 'Create the single Prive Lounge business profile.'}
        </p>
      </div>

      <form onSubmit={form.handleSubmit((values) => saveBusiness.mutate(values))} className="space-y-6 rounded-lg border bg-card p-6">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold"><Building2 className="size-4" /> Identity and contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Business name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field>
            <Field label="Legal name" error={form.formState.errors.legalName?.message}><Input {...form.register('legalName')} /></Field>
            <Field label="Primary phone" error={form.formState.errors.primaryPhoneNumber?.message}><Input {...form.register('primaryPhoneNumber')} /></Field>
            <Field label="Secondary phone" error={form.formState.errors.secondaryPhoneNumber?.message}><Input {...form.register('secondaryPhoneNumber')} /></Field>
            <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
            <Field label="Website" error={form.formState.errors.website?.message}><Input type="url" {...form.register('website')} placeholder="https://" /></Field>
            <Field label="Logo reference" error={form.formState.errors.logoReference?.message}><Input {...form.register('logoReference')} /></Field>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="font-semibold">Address</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address" error={form.formState.errors.address?.message}><Input {...form.register('address')} /></Field>
            <Field label="City" error={form.formState.errors.city?.message}><Input {...form.register('city')} /></Field>
            <Field label="Region / governorate" error={form.formState.errors.region?.message}><Input {...form.register('region')} /></Field>
            <Field label="Country" error={form.formState.errors.country?.message}><Input {...form.register('country')} /></Field>
          </div>
        </section>

        <section className="space-y-3 border-t pt-6">
          <h2 className="font-semibold">Base currency</h2>
          <select className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm" {...form.register('baseCurrencyId')}>
            <option value="">Select a currency</option>
            {currencies.filter((currency) => currency.isActive).map((currency) => <option key={currency.id} value={currency.id}>{currency.code} — {currency.name}</option>)}
          </select>
          <FormError message={form.formState.errors.baseCurrencyId?.message} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isSetupCompleted')} /> Initial setup completed</label>
        </section>

        {saveBusiness.isError && <p className="text-sm text-destructive">Could not save the business profile. Review the fields and try again.</p>}
        <Button type="submit" disabled={saveBusiness.isPending || currenciesQuery.isError}>
          {saveBusiness.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save business profile
        </Button>
      </form>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}<FormError message={error} /></label>
}

function FormError({ message }: { message?: string }) {
  return message ? <span className="text-xs font-normal text-destructive">{message}</span> : null
}

function LoadingState() {
  return <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
}
