import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
  languages,
  type AppLanguage,
  type Direction,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
} from './languages'
import {
  applyDocumentLanguageAndDirection,
  getLanguageDirection,
  isRtlLanguage,
} from './direction'
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  getLocale,
} from './formatters'

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

export const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    nav: enNavigation,
    dashboard: enDashboard,
    validation: enValidation,
    errors: enErrors,
  },
  ckb: {
    common: ckbCommon,
    navigation: ckbNavigation,
    nav: ckbNavigation,
    dashboard: ckbDashboard,
    validation: ckbValidation,
    errors: ckbErrors,
  },
  ar: {
    common: arCommon,
    navigation: arNavigation,
    nav: arNavigation,
    dashboard: arDashboard,
    validation: arValidation,
    errors: arErrors,
  },
} as const

const getInitialLanguage = (): AppLanguage => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isAppLanguage(saved)) {
      return saved
    }
  }
  return DEFAULT_LANGUAGE
}

const initialLanguage = getInitialLanguage()

// Apply initial document direction and language attributes
if (typeof document !== 'undefined') {
  applyDocumentLanguageAndDirection(initialLanguage)
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  fallbackNS: ['common', 'navigation', 'dashboard'],
  interpolation: {
    escapeValue: false,
  },
})

export function changeAppLanguage(lang: AppLanguage): void {
  if (!isAppLanguage(lang)) return
  i18n.changeLanguage(lang)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  }
  applyDocumentLanguageAndDirection(lang)
}

export function registerFeatureTranslations(
  namespace: string,
  bundles: { [lang in AppLanguage]?: Record<string, unknown> },
): void {
  for (const [lang, bundle] of Object.entries(bundles)) {
    if (bundle) {
      i18n.addResourceBundle(lang, namespace, bundle, true, true)
    }
  }
}

export {
  languages,
  type AppLanguage,
  type Direction,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  applyDocumentLanguageAndDirection,
  getLanguageDirection,
  isRtlLanguage,
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  getLocale,
}

export default i18n
