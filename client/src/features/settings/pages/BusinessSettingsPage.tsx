import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Building2,
  Globe,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { 
  useBusinessSettings, 
  useSetupBusiness, 
  useUpdateBusinessSettings 
} from '../hooks/useSettings'

const setupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  baseCurrencyCode: z.string().length(3, 'Currency code must be 3 letters').toUpperCase(),
  defaultLanguage: z.string().min(1, 'Default language is required'),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
  currencySymbolPosition: z.enum(['Before', 'After']),
  currencyDecimalPlaces: z.number().min(0).max(4),
})

const updateSchema = setupSchema.omit({ baseCurrencyCode: true }).extend({
  address: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  taxRegistrationNumber: z.string().nullable(),
  logoUrl: z.string().nullable(),
  dateFormat: z.string().min(1, 'Date format is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  invoiceNumberPrefix: z.string().nullable(),
  nextInvoiceNumber: z.number().min(1),
})

type SetupFormValues = z.infer<typeof setupSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

export function BusinessSettingsPage() {
  const { data: settings, isLoading, isError } = useBusinessSettings()
  const setupMutation = useSetupBusiness()
  const updateMutation = useUpdateBusinessSettings()
  
  const [isSuccess, setIsSuccess] = useState(false)

  const setupForm = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      businessName: '',
      baseCurrencyCode: 'IQD',
      defaultLanguage: 'ku-IQ',
      currencySymbol: 'د.ع',
      currencySymbolPosition: 'Before',
      currencyDecimalPlaces: 0,
    }
  })

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      businessName: '',
      defaultLanguage: '',
      currencySymbol: '',
      currencySymbolPosition: 'Before',
      currencyDecimalPlaces: 0,
      address: '',
      phoneNumber: '',
      taxRegistrationNumber: '',
      logoUrl: '',
      dateFormat: 'MM/dd/yyyy',
      timezone: 'UTC',
      invoiceNumberPrefix: '',
      nextInvoiceNumber: 1,
    }
  })

  useEffect(() => {
    if (settings && settings.isSetupCompleted) {
      updateForm.reset({
        businessName: settings.businessName,
        defaultLanguage: settings.defaultLanguage,
        currencySymbol: settings.currencySymbol,
        currencySymbolPosition: settings.currencySymbolPosition as any,
        currencyDecimalPlaces: settings.currencyDecimalPlaces,
        address: settings.address || '',
        phoneNumber: settings.phoneNumber || '',
        taxRegistrationNumber: settings.taxRegistrationNumber || '',
        logoUrl: settings.logoUrl || '',
        dateFormat: settings.dateFormat,
        timezone: settings.timezone,
        invoiceNumberPrefix: settings.invoiceNumberPrefix || '',
        nextInvoiceNumber: settings.nextInvoiceNumber,
      })
    }
  }, [settings, updateForm])

  const onSetupSubmit = async (data: SetupFormValues) => {
    await setupMutation.mutateAsync(data)
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
  }

  const onUpdateSubmit = async (data: UpdateFormValues) => {
    await updateMutation.mutateAsync(data)
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e05d38]" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <p>Failed to load business settings.</p>
      </div>
    )
  }

  const isSetupMode = !settings?.isSetupCompleted

  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isSetupMode ? 'Business Setup' : 'Business Settings'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSetupMode 
            ? 'Complete this one-time setup to begin using the system.'
            : 'Manage your business profile, currency, and localization.'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        {isSetupMode ? (
          <form onSubmit={setupForm.handleSubmit(onSetupSubmit)} className="p-6 space-y-8">
            {/* Setup Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-[#e05d38]" /> Business Identity
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Business Name</label>
                  <Input {...setupForm.register('businessName')} placeholder="e.g. My Salon" className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                  {setupForm.formState.errors.businessName && <p className="text-xs text-red-500">{setupForm.formState.errors.businessName.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Globe className="w-4 h-4 text-blue-500" /> Currency & Localization (Locked after setup)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base Currency Code</label>
                  <Input {...setupForm.register('baseCurrencyCode')} placeholder="IQD" maxLength={3} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50 uppercase" />
                  {setupForm.formState.errors.baseCurrencyCode && <p className="text-xs text-red-500">{setupForm.formState.errors.baseCurrencyCode.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currency Symbol</label>
                  <Input {...setupForm.register('currencySymbol')} placeholder="د.ع" className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                  {setupForm.formState.errors.currencySymbol && <p className="text-xs text-red-500">{setupForm.formState.errors.currencySymbol.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol Position</label>
                  <select {...setupForm.register('currencySymbolPosition')} className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs focus:ring-[#e05d38] focus:outline-none dark:border-slate-800">
                    <option value="Before">Before amount (e.g. $100)</option>
                    <option value="After">After amount (e.g. 100 د.ع)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decimal Places</label>
                  <Input 
                    type="number" 
                    {...setupForm.register('currencyDecimalPlaces', { valueAsNumber: true })} 
                    className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50"
                    onFocus={e => e.target.select()}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Language</label>
                  <select {...setupForm.register('defaultLanguage')} className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs focus:ring-[#e05d38] focus:outline-none dark:border-slate-800">
                    <option value="en-US">English (US)</option>
                    <option value="ku-IQ">Kurdish (Sorani)</option>
                    <option value="ar-IQ">Arabic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-4">
              <Button type="submit" disabled={setupMutation.isPending} className="bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-sm h-10 px-6 font-medium gap-2">
                {setupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Complete Setup
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="p-6 space-y-8">
            {/* Update Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-[#e05d38]" /> Business Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Business Name</label>
                  <Input {...updateForm.register('businessName')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <Input {...updateForm.register('phoneNumber')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tax/Registration No.</label>
                  <Input {...updateForm.register('taxRegistrationNumber')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Address</label>
                  <Input {...updateForm.register('address')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Globe className="w-4 h-4 text-blue-500" /> Currency & Localization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Base Currency</label>
                  <Input value={settings.baseCurrencyCode} disabled className="h-10 text-sm bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-70" />
                  <p className="text-[10px] text-slate-400">Locked</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currency Symbol</label>
                  <Input {...updateForm.register('currencySymbol')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decimals</label>
                  <Input type="number" {...updateForm.register('currencyDecimalPlaces', { valueAsNumber: true })} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" onFocus={e => e.target.select()} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol Position</label>
                  <select {...updateForm.register('currencySymbolPosition')} className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs focus:ring-[#e05d38] focus:outline-none dark:border-slate-800">
                    <option value="Before">Before</option>
                    <option value="After">After</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Language</label>
                  <select {...updateForm.register('defaultLanguage')} className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm shadow-xs focus:ring-[#e05d38] focus:outline-none dark:border-slate-800">
                    <option value="en-US">English (US)</option>
                    <option value="ku-IQ">Kurdish (Sorani)</option>
                    <option value="ar-IQ">Arabic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Timezone</label>
                  <Input {...updateForm.register('timezone')} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="w-4 h-4 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">#</span>
                Invoice Numbering
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Prefix</label>
                  <Input {...updateForm.register('invoiceNumberPrefix')} placeholder="INV-" className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Next Invoice Number</label>
                  <Input type="number" {...updateForm.register('nextInvoiceNumber', { valueAsNumber: true })} className="h-10 text-sm bg-slate-50 dark:bg-slate-800/50" onFocus={e => e.target.select()} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {isSuccess ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 className="w-5 h-5" /> Saved successfully
                </div>
              ) : <div />}
              <Button type="submit" disabled={updateMutation.isPending} className="bg-[#e05d38] hover:bg-[#c94f2d] text-white shadow-sm h-10 px-6 font-medium gap-2">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
