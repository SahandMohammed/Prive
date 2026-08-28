import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CategoriesPage } from './CategoriesPage'
import { ProductsPage } from './ProductsPage'
import { SubcategoriesPage } from './SubcategoriesPage'
import { UnitsPage } from './UnitsPage'

type DefinitionTab = 'items' | 'categories' | 'subcategories' | 'units'

const tabs: { id: DefinitionTab; label: string }[] = [
  { id: 'items', label: 'Items' },
  { id: 'categories', label: 'Categories' },
  { id: 'subcategories', label: 'Subcategories' },
  { id: 'units', label: 'Units' },
]

export function ItemDefinitionsPage() {
  const [activeTab, setActiveTab] = useState<DefinitionTab>('items')

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Item definitions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage inventory items and the organization and units used to define them.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => <Button key={tab.id} type="button" variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab(tab.id)}>{tab.label}</Button>)}
      </div>
      {activeTab === 'items' && <ProductsPage />}
      {activeTab === 'categories' && <CategoriesPage />}
      {activeTab === 'subcategories' && <SubcategoriesPage />}
      {activeTab === 'units' && <UnitsPage />}
    </div>
  )
}
