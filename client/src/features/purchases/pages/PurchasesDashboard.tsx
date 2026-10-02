import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StoreIcon, PackageIcon, Undo2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PurchasesDashboard() {
  const { t } = useTranslation(['purchases', 'common'])

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('purchases:dashboard.title')}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <PackageIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>{t('purchases:dashboard.invoicesCardTitle')}</CardTitle>
            <CardDescription>{t('purchases:dashboard.invoicesCardDesc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <Undo2Icon className="w-8 h-8 mb-2 text-primary rtl:rotate-180" />
            <CardTitle>{t('purchases:dashboard.returnsCardTitle')}</CardTitle>
            <CardDescription>{t('purchases:dashboard.returnsCardDesc')}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:bg-accent cursor-pointer transition-colors">
          <CardHeader>
            <StoreIcon className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>{t('purchases:dashboard.vendorsCardTitle')}</CardTitle>
            <CardDescription>{t('purchases:dashboard.vendorsCardDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">{t('purchases:dashboard.createInvoiceSection')}</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t('purchases:dashboard.createInvoicePlaceholder')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
