import { registerFeatureTranslations } from '@/lib/i18n'
import en from './en.json'
import ckb from './ckb.json'
import ar from './ar.json'

registerFeatureTranslations('settings', { en, ckb, ar })

export const settingsTranslations = { en, ckb, ar }
