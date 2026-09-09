import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  LogOut,
  Banknote,
  ShoppingBag,
  ShoppingCart,
  BookOpen,
  ChevronDown,
  Settings,
  Store,
  Package,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@/features/auth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useThemeStore } from '@/lib/theme'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onCloseMobile?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onCloseMobile, isCollapsed = false }: SidebarProps) {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const { theme, toggleTheme } = useThemeStore()
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ckb'
  const role = user?.role

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'AS'

  return (
    <aside
      className={cn(
        'bg-sidebar ltr:border-r rtl:border-l border-sidebar-border h-full flex flex-col shrink-0 select-none transition-all duration-300 relative',
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 shrink-0 border-b border-sidebar-border/60 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0">
          {/* Geometric Diamond Emblem */}
          <div className="size-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shrink-0 shadow-xs">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" transform="rotate(45 12 12)" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                Privé
              </span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                DASHBOARD
              </span>
            </div>
          )}
        </NavLink>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-4 space-y-4 custom-scrollbar">
        {/* OVERVIEW */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>{t('common.overview')}</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavItem
              to="/dashboard"
              icon={<LayoutDashboard className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              {t('nav.dashboard')}
            </NavItem>
            <NavItem
              to="/reports"
              icon={<BarChart3 className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              {t('nav.analytics')}
            </NavItem>
            <NavItem
              to="/pos"
              icon={<Store className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              {t('nav.pos')}
            </NavItem>
            <NavItem
              to="/contacts"
              icon={<Users className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              {t('nav.crm')}
            </NavItem>
          </div>
        </div>

        {/* COMMERCE */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>{t('common.commerce')}</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavGroup
              label={t('nav.sales')}
              icon={<ShoppingBag className="size-4" />}
              badge="12"
              isCollapsed={isCollapsed}
              activePrefixes={['/sales']}
            >
              <SubNavItem to="/sales/invoices" onClick={onCloseMobile}>{t('nav.salesInvoices')}</SubNavItem>
              <SubNavItem to="/sales/services" onClick={onCloseMobile}>{t('nav.services')}</SubNavItem>
              <SubNavItem to="/pos" onClick={onCloseMobile}>{t('nav.pos')}</SubNavItem>
            </NavGroup>

            <NavGroup
              label={t('nav.purchases')}
              icon={<ShoppingCart className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/purchases']}
            >
              <SubNavItem to="/purchases/invoices" onClick={onCloseMobile}>{t('nav.purchaseBills')}</SubNavItem>
            </NavGroup>

            <NavGroup
              label={t('nav.inventory')}
              icon={<Package className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/inventory']}
            >
              <SubNavItem to="/inventory" onClick={onCloseMobile}>{t('nav.stockOverview')}</SubNavItem>
              <SubNavItem to="/inventory/products" onClick={onCloseMobile}>{t('nav.products')}</SubNavItem>
              <SubNavItem to="/inventory/categories" onClick={onCloseMobile}>{t('nav.categories')}</SubNavItem>
              <SubNavItem to="/inventory/units" onClick={onCloseMobile}>{t('nav.units')}</SubNavItem>
              <SubNavItem to="/inventory/warehouses" onClick={onCloseMobile}>{t('nav.warehouses')}</SubNavItem>
              <SubNavItem to="/inventory/opening-stock" onClick={onCloseMobile}>{t('nav.openingStock')}</SubNavItem>
              <SubNavItem to="/inventory/adjustments" onClick={onCloseMobile}>{t('nav.adjustments')}</SubNavItem>
              <SubNavItem to="/inventory/transfers" onClick={onCloseMobile}>{t('nav.transfers')}</SubNavItem>
              <SubNavItem to="/inventory/ledger" onClick={onCloseMobile}>{t('nav.stockLedger')}</SubNavItem>
            </NavGroup>
          </div>
        </div>

        {/* FINANCIALS */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>{t('common.financials')}</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavGroup
              label={t('nav.accounting')}
              icon={<BookOpen className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/accounting']}
            >
              <SubNavItem to="/accounting/chart" onClick={onCloseMobile}>{t('nav.chartOfAccounts')}</SubNavItem>
              <SubNavItem to="/accounting/journal" onClick={onCloseMobile}>{t('nav.journalEntries')}</SubNavItem>
              <SubNavItem to="/accounting/ledger" onClick={onCloseMobile}>{t('nav.generalLedger')}</SubNavItem>
              <SubNavItem to="/accounting/trial-balance" onClick={onCloseMobile}>{t('nav.trialBalance')}</SubNavItem>
              <SubNavItem to="/accounting/currencies" onClick={onCloseMobile}>{t('nav.currencies')}</SubNavItem>
            </NavGroup>

            <NavGroup
              label={t('nav.finance')}
              icon={<Banknote className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/finance', '/expenses']}
            >
              <SubNavItem to="/finance/money-accounts" onClick={onCloseMobile}>{t('nav.moneyAccounts')}</SubNavItem>
              <SubNavItem to="/finance/money-ledger" onClick={onCloseMobile}>{t('nav.moneyLedger')}</SubNavItem>
              <SubNavItem to="/expenses" onClick={onCloseMobile}>{t('nav.expenses')}</SubNavItem>
              <SubNavItem to="/expenses/categories" onClick={onCloseMobile}>{t('nav.expenseCategories')}</SubNavItem>
              <SubNavItem to="/finance/exchange-rates" onClick={onCloseMobile}>{t('nav.exchangeRates')}</SubNavItem>
              <SubNavItem to="/finance/transfers" onClick={onCloseMobile}>{t('nav.transfers')}</SubNavItem>
              <SubNavItem to="/finance/supplier-payments" onClick={onCloseMobile}>{t('nav.supplierPayments')}</SubNavItem>
              <SubNavItem to="/finance/customer-receipts" onClick={onCloseMobile}>{t('nav.customerReceipts')}</SubNavItem>
            </NavGroup>
          </div>
        </div>

        {/* MANAGEMENT */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>{t('common.management')}</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavItem
              to="/users"
              icon={<Users className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              {t('nav.teamAndUsers')}
            </NavItem>

            <NavGroup
              label={t('nav.settings')}
              icon={<Settings className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/settings']}
            >
              <SubNavItem to="/settings/business" onClick={onCloseMobile}>{t('nav.businessSettings')}</SubNavItem>
              <SubNavItem to="/settings/branches" onClick={onCloseMobile}>{t('nav.branches')}</SubNavItem>
              <SubNavItem to="/settings/currencies" onClick={onCloseMobile}>{t('nav.currencies')}</SubNavItem>
              <SubNavItem to="/settings/items" onClick={onCloseMobile}>{t('nav.items')}</SubNavItem>
              <SubNavItem to="/settings/services" onClick={onCloseMobile}>{t('nav.services')}</SubNavItem>
              <SubNavItem to="/settings/warehouses" onClick={onCloseMobile}>{t('nav.warehouses')}</SubNavItem>
            </NavGroup>
          </div>
        </div>
      </nav>

      {/* Pinned Bottom User Card matching reference */}
      <div className="p-3 border-t border-sidebar-border/60 bg-sidebar shrink-0">
        <Popover>
          <PopoverTrigger
            className={cn(
              'w-full flex items-center rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group text-start outline-none',
              isCollapsed ? 'justify-center' : 'gap-3'
            )}
            aria-label="User profile and settings"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* User Avatar Circle */}
              <div className="size-9 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {userInitials}
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {user?.username ?? 'Admin User'}
                  </span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {role ? (role.toLowerCase() === 'admin' ? t('common.admin') : t('common.staff')) : t('common.admin')}
                  </span>
                </div>
              )}
            </div>
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align={isRtl ? 'end' : 'start'}
            sideOffset={12}
            className="w-64 p-3.5 bg-popover text-popover-foreground border border-border shadow-lg rounded-xl space-y-3 z-50"
          >
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/50">
              <div className="size-9 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user?.username ?? 'User'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {role ? (role.toLowerCase() === 'admin' ? t('common.admin') : t('common.staff')) : t('common.staff')}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                {theme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                <span>{theme === 'light' ? t('common.darkMode') : t('common.lightMode')}</span>
              </button>

              <button
                type="button"
                onClick={() => logout.mutate()}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  )
}

function NavItem({
  to,
  icon,
  children,
  badge,
  isCollapsed = false,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  badge?: string
  isCollapsed?: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={isCollapsed && typeof children === 'string' ? children : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-neutral-100 dark:bg-neutral-800/90 text-foreground font-semibold shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('shrink-0 transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
            {icon}
          </span>
          {!isCollapsed && (
            <>
              <span className="truncate text-xs">{children}</span>
              {badge && (
                <span className="ltr:ml-auto rtl:mr-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

function SubNavItem({
  to,
  children,
  onClick,
}: {
  to: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors duration-150 w-full',
          isActive
            ? 'bg-neutral-100 dark:bg-neutral-800 text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'size-1.5 rounded-full shrink-0 transition-colors',
              isActive ? 'bg-foreground ring-2 ring-foreground/20' : 'bg-muted-foreground/40 group-hover:bg-muted-foreground/70'
            )}
          />
          <span className="truncate">{children}</span>
        </>
      )}
    </NavLink>
  )
}

function NavGroup({
  label,
  icon,
  badge,
  isCollapsed = false,
  children,
  activePrefixes = [],
}: {
  label: string
  icon: React.ReactNode
  badge?: string
  isCollapsed?: boolean
  children: React.ReactNode
  activePrefixes?: string[]
}) {
  const location = useLocation()
  const isCurrentlyInGroup = activePrefixes.some((prefix) => location.pathname.startsWith(prefix))
  const [userToggled, setUserToggled] = useState<boolean | null>(null)

  const isOpen = userToggled ?? isCurrentlyInGroup

  if (isCollapsed) {
    return (
      <div className="flex justify-center p-1">
        <span
          title={label}
          className={cn(
            'p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer',
            isCurrentlyInGroup && 'bg-neutral-100 dark:bg-neutral-800 text-foreground'
          )}
        >
          {icon}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setUserToggled(!isOpen)}
        className={cn(
          'group flex items-center justify-between w-full px-3 py-2.5 text-xs font-medium rounded-xl transition-colors duration-150',
          isCurrentlyInGroup
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-muted-foreground group-hover:text-foreground">
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-3.5 text-muted-foreground/60 transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90'
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="ltr:pl-3 rtl:pr-3 space-y-0.5 ltr:border-l rtl:border-r border-sidebar-border ltr:ml-5 rtl:mr-5 py-0.5 my-0.5">
          {children}
        </div>
      )}
    </div>
  )
}
