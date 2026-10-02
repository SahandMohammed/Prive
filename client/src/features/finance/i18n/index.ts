import { registerFeatureTranslations } from '@/lib/i18n'
import en from './en.json'
import ckb from './ckb.json'
import ar from './ar.json'

registerFeatureTranslations('finance', { en, ckb, ar })

export const financeTranslations = { en, ckb, ar }
