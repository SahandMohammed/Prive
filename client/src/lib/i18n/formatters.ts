import i18n from 'i18next'
import { languages, DEFAULT_LANGUAGE, isAppLanguage } from './languages'

export function getLocale(language?: string | null): string {
  if (isAppLanguage(language)) {
    return languages[language].locale
  }
  const current = i18n.resolvedLanguage || i18n.language
  if (isAppLanguage(current)) {
    return languages[current].locale
  }
  return languages[DEFAULT_LANGUAGE].locale
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  language?: string,
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0'
  }
  const locale = getLocale(language)
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatCurrency(
  value: number,
  currency: string = 'IQD',
  options?: Intl.NumberFormatOptions,
  language?: string,
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return `0 ${currency}`
  }
  const locale = getLocale(language)
  const isIqd = currency.toUpperCase() === 'IQD'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: isIqd ? 0 : 2,
    ...options,
  }).format(value)
}

export function formatDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  language?: string,
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) {
    return ''
  }
  const locale = getLocale(language)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...options,
  }).format(date)
}

export function formatDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  language?: string,
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) {
    return ''
  }
  const locale = getLocale(language)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}
