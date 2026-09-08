import { BriefcaseBusiness, LayoutGrid, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCategory } from '../types/pos.types'

export function PosCategoryNav({
  categories,
  itemType,
  categoryId,
  horizontal = false,
  onTypeChange,
  onCategoryChange,
}: {
  categories: PosCategory[]
  itemType: '' | PosCatalogItemType
  categoryId: string
  horizontal?: boolean
  onTypeChange: (type: '' | PosCatalogItemType) => void
  onCategoryChange: (category: PosCategory) => void
}) {
  const visibleCategories = categories.filter(
    (category) => itemType === '' || category.itemType === itemType
  )

  return (
    <nav
      aria-label="POS catalog categories"
      className={cn(
        horizontal ? 'flex gap-2 overflow-x-auto pb-1' : 'flex h-full flex-col gap-1.5 overflow-y-auto p-3'
      )}
    >
      <NavButton
        horizontal={horizontal}
        active={itemType === '' && !categoryId}
        icon={<LayoutGrid className="size-4" />}
        onClick={() => onTypeChange('')}
      >
        All
      </NavButton>
      <NavButton
        horizontal={horizontal}
        active={itemType === PosCatalogItemType.Service && !categoryId}
        icon={<BriefcaseBusiness className="size-4" />}
        onClick={() => onTypeChange(PosCatalogItemType.Service)}
      >
        Services
      </NavButton>
      <NavButton
        horizontal={horizontal}
        active={itemType === PosCatalogItemType.Product && !categoryId}
        icon={<Package className="size-4" />}
        onClick={() => onTypeChange(PosCatalogItemType.Product)}
      >
        Products
      </NavButton>

      {!horizontal && <div className="my-2 border-t" />}

      {visibleCategories.map((category) => (
        <NavButton
          key={`${category.itemType}-${category.id}`}
          horizontal={horizontal}
          active={categoryId === category.id}
          icon={
            category.itemType === PosCatalogItemType.Service ? (
              <BriefcaseBusiness className="size-4" />
            ) : (
              <Package className="size-4" />
            )
          }
          onClick={() => onCategoryChange(category)}
        >
          {category.name}
        </NavButton>
      ))}
    </nav>
  )
}

function NavButton({
  active,
  horizontal,
  icon,
  children,
  onClick,
}: {
  active: boolean
  horizontal: boolean
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        'justify-start gap-2 text-sm',
        horizontal ? 'h-9 shrink-0 px-3' : 'h-10 w-full px-3',
        active && 'font-semibold'
      )}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Button>
  )
}
