import { describe, it } from 'vitest'
import { verifyKeyParity } from '@/lib/i18n/i18n.test'

import { salesTranslations } from '@/features/sales'
import { inventoryTranslations } from '@/features/inventory'
import { financeTranslations } from '@/features/finance'
import { accountingTranslations } from '@/features/accounting'
import { purchasesTranslations } from '@/features/purchases'
import { posTranslations } from '@/features/pos'
import { settingsTranslations } from '@/features/settings'

describe('Feature Translation Key Parity', () => {
  const featureNamespaces: Record<
    string,
    { en: Record<string, unknown>; ckb: Record<string, unknown>; ar: Record<string, unknown> }
  > = {
    sales: salesTranslations,
    inventory: inventoryTranslations,
    finance: financeTranslations,
    accounting: accountingTranslations,
    purchases: purchasesTranslations,
    pos: posTranslations,
    settings: settingsTranslations,
  }

  for (const [ns, bundles] of Object.entries(featureNamespaces)) {
    it(`verifies Kurdish key parity for feature namespace "${ns}"`, () => {
      verifyKeyParity(ns, bundles.en, bundles.ckb, 'ckb')
    })

    it(`verifies Arabic key parity for feature namespace "${ns}"`, () => {
      verifyKeyParity(ns, bundles.en, bundles.ar, 'ar')
    })
  }
})
