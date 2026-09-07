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
import { BranchSelector } from '@/features/business'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useThemeStore } from '@/lib/theme'
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
  const role = user?.role

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'AS'

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border h-full flex flex-col shrink-0 select-none transition-all duration-300 relative',
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
              <span>Overview</span>
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
              Dashboard
            </NavItem>
            <NavItem
              to="/reports"
              icon={<BarChart3 className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              Analytics
            </NavItem>
            <NavItem
              to="/pos"
              icon={<Store className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              POS Terminal
            </NavItem>
            <NavItem
              to="/contacts"
              icon={<Users className="size-4" />}
              isCollapsed={isCollapsed}
              onClick={onCloseMobile}
            >
              CRM & Clients
            </NavItem>
          </div>
        </div>

        {/* COMMERCE */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>Commerce</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavGroup
              label="Sales"
              icon={<ShoppingBag className="size-4" />}
              badge="12"
              isCollapsed={isCollapsed}
              activePrefixes={['/sales']}
            >
              <SubNavItem to="/sales/invoices" onClick={onCloseMobile}>Sales Invoices</SubNavItem>
              <SubNavItem to="/sales/services" onClick={onCloseMobile}>Services</SubNavItem>
              <SubNavItem to="/pos" onClick={onCloseMobile}>POS Terminal</SubNavItem>
            </NavGroup>

            <NavGroup
              label="Purchases"
              icon={<ShoppingCart className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/purchases']}
            >
              <SubNavItem to="/purchases/invoices" onClick={onCloseMobile}>Purchase Bills</SubNavItem>
            </NavGroup>

            <NavGroup
              label="Inventory"
              icon={<Package className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/inventory']}
            >
              <SubNavItem to="/inventory" onClick={onCloseMobile}>Stock Overview</SubNavItem>
              <SubNavItem to="/inventory/products" onClick={onCloseMobile}>Products</SubNavItem>
              <SubNavItem to="/inventory/categories" onClick={onCloseMobile}>Categories</SubNavItem>
              <SubNavItem to="/inventory/units" onClick={onCloseMobile}>Units</SubNavItem>
              <SubNavItem to="/inventory/warehouses" onClick={onCloseMobile}>Warehouses</SubNavItem>
              <SubNavItem to="/inventory/opening-stock" onClick={onCloseMobile}>Opening Stock</SubNavItem>
              <SubNavItem to="/inventory/adjustments" onClick={onCloseMobile}>Adjustments</SubNavItem>
              <SubNavItem to="/inventory/transfers" onClick={onCloseMobile}>Transfers</SubNavItem>
              <SubNavItem to="/inventory/ledger" onClick={onCloseMobile}>Stock Ledger</SubNavItem>
            </NavGroup>
          </div>
        </div>

        {/* FINANCIALS */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>Financials</span>
              <ChevronDown className="size-3 text-muted-foreground/50" />
            </p>
          )}
          <div className="space-y-1">
            <NavGroup
              label="Accounting"
              icon={<BookOpen className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/accounting']}
            >
              <SubNavItem to="/accounting/chart" onClick={onCloseMobile}>Chart of Accounts</SubNavItem>
              <SubNavItem to="/accounting/journal" onClick={onCloseMobile}>Journal Entries</SubNavItem>
              <SubNavItem to="/accounting/ledger" onClick={onCloseMobile}>General Ledger</SubNavItem>
              <SubNavItem to="/accounting/trial-balance" onClick={onCloseMobile}>Trial Balance</SubNavItem>
              <SubNavItem to="/accounting/currencies" onClick={onCloseMobile}>Currencies</SubNavItem>
            </NavGroup>

            <NavGroup
              label="Finance"
              icon={<Banknote className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/finance', '/expenses']}
            >
              <SubNavItem to="/finance/money-accounts" onClick={onCloseMobile}>Money Accounts</SubNavItem>
              <SubNavItem to="/finance/money-ledger" onClick={onCloseMobile}>Money Ledger</SubNavItem>
              <SubNavItem to="/expenses" onClick={onCloseMobile}>Expenses</SubNavItem>
              <SubNavItem to="/expenses/categories" onClick={onCloseMobile}>Expense Categories</SubNavItem>
              <SubNavItem to="/finance/exchange-rates" onClick={onCloseMobile}>Exchange Rates</SubNavItem>
              <SubNavItem to="/finance/transfers" onClick={onCloseMobile}>Transfers</SubNavItem>
              <SubNavItem to="/finance/supplier-payments" onClick={onCloseMobile}>Supplier Payments</SubNavItem>
              <SubNavItem to="/finance/customer-receipts" onClick={onCloseMobile}>Customer Receipts</SubNavItem>
            </NavGroup>
          </div>
        </div>

        {/* MANAGEMENT */}
        <div>
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.16em] flex items-center justify-between">
              <span>Management</span>
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
              Team & Users
            </NavItem>

            <NavGroup
              label="Settings"
              icon={<Settings className="size-4" />}
              isCollapsed={isCollapsed}
              activePrefixes={['/settings']}
            >
              <SubNavItem to="/settings/business" onClick={onCloseMobile}>Business Settings</SubNavItem>
              <SubNavItem to="/settings/branches" onClick={onCloseMobile}>Branches</SubNavItem>
              <SubNavItem to="/settings/currencies" onClick={onCloseMobile}>Currencies</SubNavItem>
              <SubNavItem to="/settings/items" onClick={onCloseMobile}>Items</SubNavItem>
              <SubNavItem to="/settings/services" onClick={onCloseMobile}>Services</SubNavItem>
              <SubNavItem to="/settings/warehouses" onClick={onCloseMobile}>Warehouses</SubNavItem>
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
              isCollapsed ? 'justify-center' : 'justify-between gap-3'
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
                    {role ? role.toLowerCase() : 'Admin'}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  logout.mutate()
                }}
                className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                title="Log out"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="start"
            sideOffset={12}
            className="w-64 p-3.5 bg-popover text-popover-foreground border border-border shadow-lg rounded-xl space-y-3 z-50"
          >
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/50">
              <div className="size-9 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user?.username ?? 'User'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role ?? 'Staff'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Active Branch
              </p>
              <BranchSelector />
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                {theme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <button
                type="button"
                onClick={() => logout.mutate()}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Log out</span>
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
                <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
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
        <div className="pl-3 space-y-0.5 border-l border-sidebar-border ml-5 py-0.5 my-0.5">
          {children}
        </div>
      )}
    </div>
  )
}
