import { languages, type AppLanguage, type Direction, DEFAULT_LANGUAGE, isAppLanguage } from './languages'

export function getLanguageDirection(lang: string | null | undefined): Direction {
  if (isAppLanguage(lang)) {
    return languages[lang].direction
  }
  return languages[DEFAULT_LANGUAGE].direction
}

export function isRtlLanguage(lang: string | null | undefined): boolean {
  return getLanguageDirection(lang) === 'rtl'
}

export function applyDocumentLanguageAndDirection(lang: string | null | undefined): void {
  if (typeof document === 'undefined') return
  const safeLang: AppLanguage = isAppLanguage(lang) ? lang : DEFAULT_LANGUAGE
  const config = languages[safeLang]
  document.documentElement.lang = config.locale
  document.documentElement.dir = config.direction
  document.documentElement.dataset.language = config.code
}

