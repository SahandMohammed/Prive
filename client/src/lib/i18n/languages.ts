export const languages = {
  en: {
    code: 'en',
    locale: 'en-IQ',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  ckb: {
    code: 'ckb',
    locale: 'ckb-IQ',
    name: 'Kurdish',
    nativeName: 'کوردی',
    direction: 'rtl',
  },
  ar: {
    code: 'ar',
    locale: 'ar-IQ',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
  },
} as const

export type AppLanguage = keyof typeof languages
export type Direction = (typeof languages)[AppLanguage]['direction']

export const DEFAULT_LANGUAGE: AppLanguage = 'en'
export const LANGUAGE_STORAGE_KEY = 'prive_language'

export function isAppLanguage(lang: string | null | undefined): lang is AppLanguage {
  return typeof lang === 'string' && Object.prototype.hasOwnProperty.call(languages, lang)
}
