import { useTranslation } from 'react-i18next'

export function SalesReturnsPage() {
  const { t } = useTranslation(['sales'])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('sales:returns.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sales:returns.subtitle')}</p>
      </div>
      <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
        {t('sales:returns.placeholder')}
      </div>
    </div>
  )
}
