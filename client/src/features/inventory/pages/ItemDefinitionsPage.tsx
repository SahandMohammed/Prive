import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CategoriesPage } from './CategoriesPage'
import { ProductsPage } from './ProductsPage'
import { SubcategoriesPage } from './SubcategoriesPage'
import { UnitsPage } from './UnitsPage'

type DefinitionTab = 'items' | 'categories' | 'subcategories' | 'units'

export function ItemDefinitionsPage() {
  const { t } = useTranslation('inventory')
  const [activeTab, setActiveTab] = useState<DefinitionTab>('items')

  const tabs: { id: DefinitionTab; label: string }[] = [
    { id: 'items', label: t('inventory:definitions.tabs.items') },
    { id: 'categories', label: t('inventory:definitions.tabs.categories') },
    { id: 'subcategories', label: t('inventory:definitions.tabs.subcategories') },
    { id: 'units', label: t('inventory:definitions.tabs.units') },
  ]

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory:definitions.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('inventory:definitions.description')}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {activeTab === 'items' && <ProductsPage />}
      {activeTab === 'categories' && <CategoriesPage />}
      {activeTab === 'subcategories' && <SubcategoriesPage />}
      {activeTab === 'units' && <UnitsPage />}
    </div>
  )
}
