import { registerFeatureTranslations } from '@/lib/i18n'
import en from './en.json'
import ckb from './ckb.json'
import ar from './ar.json'

registerFeatureTranslations('auth', { en, ckb, ar })

export const authTranslations = { en, ckb, ar }
