import { describe, it, expect, beforeEach } from 'vitest'
import i18n, {
  languages,
  type AppLanguage,
  isAppLanguage,
  getLanguageDirection,
  isRtlLanguage,
  applyDocumentLanguageAndDirection,
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  changeAppLanguage,
  registerFeatureTranslations,
  LANGUAGE_STORAGE_KEY,
} from './index'

// Shared locale resources
import enCommon from './locales/en/common.json'
import ckbCommon from './locales/ckb/common.json'
import arCommon from './locales/ar/common.json'

import enNavigation from './locales/en/navigation.json'
import ckbNavigation from './locales/ckb/navigation.json'
import arNavigation from './locales/ar/navigation.json'

import enDashboard from './locales/en/dashboard.json'
import ckbDashboard from './locales/ckb/dashboard.json'
import arDashboard from './locales/ar/dashboard.json'

import enValidation from './locales/en/validation.json'
import ckbValidation from './locales/ckb/validation.json'
import arValidation from './locales/ar/validation.json'

import enErrors from './locales/en/errors.json'
import ckbErrors from './locales/ckb/errors.json'
import arErrors from './locales/ar/errors.json'

export function getDeepKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getDeepKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

export function verifyKeyParity(
  namespace: string,
  enBundle: Record<string, unknown>,
  targetBundle: Record<string, unknown>,
  targetLang: AppLanguage,
) {
  const enKeys = getDeepKeys(enBundle)
  const targetKeys = new Set(getDeepKeys(targetBundle))
  const missingKeys = enKeys.filter((k) => !targetKeys.has(k))

  if (missingKeys.length > 0) {
    throw new Error(
      `Namespace "${namespace}" has missing keys in [${targetLang}]:\n` +
        missingKeys.map((k) => `  - ${k}`).join('\n'),
    )
  }
}

describe('Shared Translation Key Parity', () => {
  const sharedNamespaces: Record<
    string,
    { en: Record<string, unknown>; ckb: Record<string, unknown>; ar: Record<string, unknown> }
  > = {
    common: { en: enCommon, ckb: ckbCommon, ar: arCommon },
    navigation: { en: enNavigation, ckb: ckbNavigation, ar: arNavigation },
    dashboard: { en: enDashboard, ckb: ckbDashboard, ar: arDashboard },
    validation: { en: enValidation, ckb: ckbValidation, ar: arValidation },
    errors: { en: enErrors, ckb: ckbErrors, ar: arErrors },
  }

  for (const [ns, bundles] of Object.entries(sharedNamespaces)) {
    it(`verifies Kurdish key parity for shared namespace "${ns}"`, () => {
      verifyKeyParity(ns, bundles.en, bundles.ckb, 'ckb')
    })

    it(`verifies Arabic key parity for shared namespace "${ns}"`, () => {
      verifyKeyParity(ns, bundles.en, bundles.ar, 'ar')
    })
  }
})

describe('Language Configuration', () => {
  it('defines the required supported languages', () => {
    expect(languages.en).toEqual({
      code: 'en',
      locale: 'en-IQ',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
    })

    expect(languages.ckb).toEqual({
      code: 'ckb',
      locale: 'ckb-IQ',
      name: 'Kurdish',
      nativeName: 'کوردی',
      direction: 'rtl',
    })

    expect(languages.ar).toEqual({
      code: 'ar',
      locale: 'ar-IQ',
      name: 'Arabic',
      nativeName: 'العربية',
      direction: 'rtl',
    })
  })

  it('validates supported languages via isAppLanguage', () => {
    expect(isAppLanguage('en')).toBe(true)
    expect(isAppLanguage('ckb')).toBe(true)
    expect(isAppLanguage('ar')).toBe(true)
    expect(isAppLanguage('fr')).toBe(false)
    expect(isAppLanguage(null)).toBe(false)
    expect(isAppLanguage(undefined)).toBe(false)
  })
})

describe('Direction Helpers', () => {
  it('returns correct direction for all languages', () => {
    expect(getLanguageDirection('en')).toBe('ltr')
    expect(getLanguageDirection('ckb')).toBe('rtl')
    expect(getLanguageDirection('ar')).toBe('rtl')
    expect(getLanguageDirection('invalid')).toBe('ltr') // fallback
  })

  it('correctly identifies RTL languages', () => {
    expect(isRtlLanguage('en')).toBe(false)
    expect(isRtlLanguage('ckb')).toBe(true)
    expect(isRtlLanguage('ar')).toBe(true)
  })

  it('applies document lang and dir attributes', () => {
    applyDocumentLanguageAndDirection('en')
    expect(document.documentElement.lang).toBe('en-IQ')
    expect(document.documentElement.dir).toBe('ltr')

    applyDocumentLanguageAndDirection('ckb')
    expect(document.documentElement.lang).toBe('ckb-IQ')
    expect(document.documentElement.dir).toBe('rtl')

    applyDocumentLanguageAndDirection('ar')
    expect(document.documentElement.lang).toBe('ar-IQ')
    expect(document.documentElement.dir).toBe('rtl')
  })
})

describe('Formatters', () => {
  it('formats numbers according to active or specified language', () => {
    const enFormatted = formatNumber(12345.67, undefined, 'en')
    expect(enFormatted).toBe('12,345.67')

    const arFormatted = formatNumber(12345.67, undefined, 'ar')
    expect(arFormatted).toContain('١٢')
  })

  it('formats currency with IQD and USD defaults', () => {
    const enIqd = formatCurrency(10000, 'IQD', undefined, 'en')
    expect(enIqd).toContain('10,000')

    const enUsd = formatCurrency(50.5, 'USD', undefined, 'en')
    expect(enUsd).toContain('50.50')

    const arIqd = formatCurrency(10000, 'IQD', undefined, 'ar')
    expect(arIqd).toBeDefined()
    expect(arIqd.length).toBeGreaterThan(0)
  })

  it('formats dates and date-times gracefully', () => {
    const testDate = new Date('2026-10-01T12:00:00Z')
    const formattedDate = formatDate(testDate, undefined, 'en')
    expect(formattedDate).toBeDefined()
    expect(formattedDate.length).toBeGreaterThan(0)

    const formattedTime = formatDateTime(testDate, undefined, 'en')
    expect(formattedTime).toBeDefined()

    expect(formatDate('invalid-date')).toBe('')
    expect(formatDateTime('invalid-date')).toBe('')
  })
})

describe('Language Switching & Feature Registration', () => {
  beforeEach(() => {
    localStorage.clear()
    changeAppLanguage('en')
  })

  it('changes language, persists to storage, and updates document', () => {
    changeAppLanguage('ckb')
    expect(i18n.language).toBe('ckb')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ckb')
    expect(document.documentElement.lang).toBe('ckb-IQ')
    expect(document.documentElement.dir).toBe('rtl')

    changeAppLanguage('ar')
    expect(i18n.language).toBe('ar')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar')
    expect(document.documentElement.lang).toBe('ar-IQ')
    expect(document.documentElement.dir).toBe('rtl')

    changeAppLanguage('en')
    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en-IQ')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('allows registering additional feature translations dynamically', () => {
    registerFeatureTranslations('customFeature', {
      en: { testKey: 'Hello World' },
      ckb: { testKey: 'سڵاو جیهان' },
      ar: { testKey: 'مرحبا بالعالم' },
    })

    expect(i18n.t('customFeature:testKey', { lng: 'en' })).toBe('Hello World')
    expect(i18n.t('customFeature:testKey', { lng: 'ckb' })).toBe('سڵاو جیهان')
    expect(i18n.t('customFeature:testKey', { lng: 'ar' })).toBe('مرحبا بالعالم')
  })
})
