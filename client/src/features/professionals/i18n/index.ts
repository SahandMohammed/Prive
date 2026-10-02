import { registerFeatureTranslations } from '@/lib/i18n'
import en from './en.json'
import ckb from './ckb.json'
import ar from './ar.json'

registerFeatureTranslations('professionals', { en, ckb, ar })

export const professionalsTranslations = { en, ckb, ar }
