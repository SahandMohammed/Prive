import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { DollarSign, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { useCurrentDollarRate, useSetDollarRate } from '../hooks/useFinance'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useCurrentBusiness } from '@/features/business'
import { dollarRateSchema } from '../schemas/finance.schema'
import type { SetDollarRateInput } from '../types/finance.types'

const localDateKey = (value: Date, timeZone?: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value)

function isSavedToday(effectiveAtUtc: string | null, todayKey = localDateKey(new Date()), timeZone?: string) {
  return effectiveAtUtc !== null && localDateKey(new Date(effectiveAtUtc), timeZone) === todayKey
}

function millisecondsUntilNextBusinessMidnight(now: Date, timeZone?: string) {
  const today = localDateKey(now, timeZone)
  let lower = now.getTime()
  let upper = lower + 36 * 60 * 60 * 1000
  while (localDateKey(new Date(upper), timeZone) === today) upper += 12 * 60 * 60 * 1000
  while (upper - lower > 1) {
    const midpoint = Math.floor((lower + upper) / 2)
    if (localDateKey(new Date(midpoint), timeZone) === today) lower = midpoint
    else upper = midpoint
  }
  return Math.max(1000, upper - now.getTime())
}

export function DollarRatePopover() {
  const { t } = useTranslation()
  const user = useCurrentUser().data
  const business = useCurrentBusiness().data
  const currentDollarRate = useCurrentDollarRate()
  const refreshDollarRate = currentDollarRate.refetch
  const setDollarRate = useSetDollarRate()
  const resetDollarRate = setDollarRate.reset
  const [open, setOpen] = useState(false)
  const [todayKey, setTodayKey] = useState(() => localDateKey(new Date(), business?.timeZoneId))
  const form = useForm<SetDollarRateInput>({
    resolver: zodResolver(dollarRateSchema),
    defaultValues: { rate: undefined },
  })

  const dollarRate = currentDollarRate.data
  const savedToday = isSavedToday(dollarRate?.effectiveAtUtc ?? null, todayKey, business?.timeZoneId)
  const canEdit = hasCapability(user?.role, 'manageDollarRate')
  const hasTodayRate = !dollarRate?.isBaseCurrency && dollarRate?.rate !== null && savedToday
  const formattedRate = dollarRate?.rate?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })

  useEffect(() => {
    const now = new Date()
    const timeout = window.setTimeout(() => {
      setTodayKey(localDateKey(new Date(), business?.timeZoneId))
      void refreshDollarRate()
    }, millisecondsUntilNextBusinessMidnight(now, business?.timeZoneId))
    return () => window.clearTimeout(timeout)
  }, [business?.timeZoneId, refreshDollarRate, todayKey])

  useEffect(() => {
    if (!open) return
    form.reset({ rate: hasTodayRate ? dollarRate?.rate ?? undefined : undefined })
    resetDollarRate()
  }, [dollarRate?.rate, form, hasTodayRate, open, resetDollarRate])

  const submit = form.handleSubmit((values) => {
    setDollarRate.mutate(values, { onSuccess: () => setOpen(false) })
  })

  let triggerLabel = t('common.dollarRateSetToday')
  if (currentDollarRate.isPending) triggerLabel = t('common.dollarRateLoading')
  else if (currentDollarRate.isError) triggerLabel = t('common.dollarRateUnavailable')
  else if (dollarRate?.isBaseCurrency) triggerLabel = '1 USD = 1 USD'
  else if (hasTodayRate && dollarRate) triggerLabel = `1 USD = ${formattedRate} ${dollarRate.baseCurrencyCode}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('common.dollarRate')}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        {currentDollarRate.isPending ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : canEdit ? (
          <DollarSign className="size-3.5 text-emerald-600" />
        ) : <DollarSign className="size-3.5 text-muted-foreground" />}
        <span className="hidden lg:inline">{triggerLabel}</span>
        <span className="lg:hidden">USD</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverHeader>
          <PopoverTitle>{t('common.dollarRateCurrent')}</PopoverTitle>
          <PopoverDescription>
            {dollarRate?.baseCurrencyCode
              ? t('common.dollarRateDescription', { currency: dollarRate.baseCurrencyCode })
              : t('common.dollarRateLoading')}
          </PopoverDescription>
        </PopoverHeader>

        {currentDollarRate.isPending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('common.dollarRateLoading')}
          </div>
        ) : currentDollarRate.isError ? (
          <div className="space-y-2" role="alert">
            <p className="text-xs text-destructive">{currentDollarRate.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void currentDollarRate.refetch()}>
              {t('common.dollarRateRetry')}
            </Button>
          </div>
        ) : dollarRate?.isBaseCurrency ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t('common.dollarRateBaseCurrency')}
          </p>
        ) : !canEdit ? (
          <div className="space-y-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {hasTodayRate && <p>1 USD = {formattedRate} {dollarRate?.baseCurrencyCode}</p>}
            <p>Only a Manager, Owner, or SuperAdmin can update the USD rate.</p>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {hasTodayRate && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                1 USD = {formattedRate} {dollarRate?.baseCurrencyCode}
              </p>
            )}
            <label className="block space-y-1.5 text-xs font-medium text-foreground">
              <span>{t('common.dollarRateInput')}</span>
              <Input
                type="number"
                min="0.000001"
                step="0.000001"
                inputMode="decimal"
                placeholder={`1 USD = ${dollarRate?.baseCurrencyCode ?? ''}`}
                className="font-mono"
                {...form.register('rate', { valueAsNumber: true })}
              />
              {form.formState.errors.rate?.message && (
                <span className="text-[11px] font-normal text-destructive">
                  {form.formState.errors.rate.message}
                </span>
              )}
            </label>
            {setDollarRate.isError && (
              <p className="text-xs text-destructive" role="alert">{setDollarRate.error.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={setDollarRate.isPending}>
              {setDollarRate.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('common.dollarRateSave')}
            </Button>
          </form>
        )}

        <Link
          to="/finance/exchange-rates"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t('common.dollarRateViewHistory')}
        </Link>
      </PopoverContent>
    </Popover>
  )
}
