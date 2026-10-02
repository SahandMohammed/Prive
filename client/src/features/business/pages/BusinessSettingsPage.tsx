import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  logoReference: '', timeZoneId: 'Asia/Baghdad', receiptFooter: '', receiptPaperWidth: 'Mm80', baseCurrencyId: '', isSetupCompleted: true,
}

export function BusinessSettingsPage() {
  const { t } = useTranslation(['business', 'common'])
  const businessQuery = useCurrentBusiness()
  const currenciesQuery = useCurrencies()
  const business = businessQuery.data
  const saveBusiness = useSaveBusiness(Boolean(business))
  const form = useForm<BusinessFormValues, unknown, BusinessInput>({ resolver: zodResolver(businessSchema), defaultValues: emptyValues })

  useEffect(() => {
    if (business) form.reset({ ...business, legalName: business.legalName ?? '', secondaryPhoneNumber: business.secondaryPhoneNumber ?? '', email: business.email ?? '', website: business.website ?? '', logoReference: business.logoReference ?? '', receiptFooter: business.receiptFooter ?? '' })
  }, [business, form])

  if (currenciesQuery.isLoading || businessQuery.isLoading) {
    return <LoadingState />
  }

  const currencies = currenciesQuery.data?.data ?? []
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {business ? t('business:settings.titleProfile') : t('business:settings.titleSetup')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business ? t('business:settings.descProfile') : t('business:settings.descSetup')}
        </p>
      </div>

      <form onSubmit={form.handleSubmit((values) => saveBusiness.mutate(values))} className="space-y-6 rounded-lg border bg-card p-6">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold"><Building2 className="size-4" /> {t('business:settings.sections.identityAndContact')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('business:settings.fields.businessName')} error={form.formState.errors.name?.message}>
              <Input className="text-start" {...form.register('name')} />
            </Field>
            <Field label={t('business:settings.fields.legalName')} error={form.formState.errors.legalName?.message}>
              <Input className="text-start" {...form.register('legalName')} />
            </Field>
            <Field label={t('business:settings.fields.primaryPhone')} error={form.formState.errors.primaryPhoneNumber?.message}>
              <Input className="text-start" {...form.register('primaryPhoneNumber')} />
            </Field>
            <Field label={t('business:settings.fields.secondaryPhone')} error={form.formState.errors.secondaryPhoneNumber?.message}>
              <Input className="text-start" {...form.register('secondaryPhoneNumber')} />
            </Field>
            <Field label={t('business:settings.fields.email')} error={form.formState.errors.email?.message}>
              <Input type="email" className="text-start" {...form.register('email')} />
            </Field>
            <Field label={t('business:settings.fields.website')} error={form.formState.errors.website?.message}>
              <Input type="url" className="text-start" {...form.register('website')} placeholder="https://" />
            </Field>
            <Field label={t('business:settings.fields.logoReference')} error={form.formState.errors.logoReference?.message}>
              <Input className="text-start" {...form.register('logoReference')} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="font-semibold">{t('business:settings.sections.address')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('business:settings.fields.address')} error={form.formState.errors.address?.message}>
              <Input className="text-start" {...form.register('address')} />
            </Field>
            <Field label={t('business:settings.fields.city')} error={form.formState.errors.city?.message}>
              <Input className="text-start" {...form.register('city')} />
            </Field>
            <Field label={t('business:settings.fields.region')} error={form.formState.errors.region?.message}>
              <Input className="text-start" {...form.register('region')} />
            </Field>
            <Field label={t('business:settings.fields.country')} error={form.formState.errors.country?.message}>
              <Input className="text-start" {...form.register('country')} />
            </Field>
          </div>
        </section>

        <section className="space-y-3 border-t pt-6">
          <h2 className="font-semibold">{t('business:settings.sections.timeZoneAndReceipts')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('business:settings.fields.timeZone')} error={form.formState.errors.timeZoneId?.message}>
              <Input className="text-start" {...form.register('timeZoneId')} placeholder="Asia/Baghdad" />
            </Field>
            <Field label={t('business:settings.fields.receiptPaperWidth')} error={form.formState.errors.receiptPaperWidth?.message}>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-start" {...form.register('receiptPaperWidth')}>
                <option value="Mm80">{t('business:settings.paperWidth.mm80')}</option>
                <option value="Mm58">{t('business:settings.paperWidth.mm58')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('business:settings.fields.receiptFooter')} error={form.formState.errors.receiptFooter?.message}>
            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-start" {...form.register('receiptFooter')} />
          </Field>
        </section>

        <section className="space-y-3 border-t pt-6">
          <h2 className="font-semibold">{t('business:settings.sections.baseCurrency')}</h2>
          <select className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm text-start" {...form.register('baseCurrencyId')}>
            <option value="">{t('business:settings.fields.selectCurrency')}</option>
            {currencies.filter((currency) => currency.isActive).map((currency) => (
              <option key={currency.id} value={currency.id}>{currency.code} — {currency.name}</option>
            ))}
          </select>
          <FormError message={form.formState.errors.baseCurrencyId?.message} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isSetupCompleted')} /> {t('business:settings.fields.initialSetupCompleted')}
          </label>
        </section>

        {saveBusiness.isError && <p className="text-sm text-destructive">{t('business:settings.saveError')}</p>}
        <Button type="submit" disabled={saveBusiness.isPending || currenciesQuery.isError}>
          {saveBusiness.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saveBusiness.isPending ? t('business:settings.saving') : t('business:settings.saveButton')}
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
