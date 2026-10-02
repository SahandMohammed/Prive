import { useTranslation } from 'react-i18next'

export function PurchaseReturnsPage() {
  const { t } = useTranslation(['purchases', 'common'])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('purchases:returns.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('purchases:returns.subtitle')}</p>
      </div>
      <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
        {t('purchases:returns.placeholder')}
      </div>
    </div>
  )
}
