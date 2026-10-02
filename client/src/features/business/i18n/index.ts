import { registerFeatureTranslations } from '@/lib/i18n'
import en from './en.json'
import ckb from './ckb.json'
import ar from './ar.json'

registerFeatureTranslations('business', { en, ckb, ar })

export const businessTranslations = { en, ckb, ar }
