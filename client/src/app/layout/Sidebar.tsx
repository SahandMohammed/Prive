import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
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
  Building2,
  ChevronsUpDown,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@/features/auth'
import { BranchSelector, useBranchAccess, useBranchSelectionStore } from '@/features/business'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useThemeStore } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onCloseMobile?: () => void
}

export function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const { data: user, isPending } = useCurrentUser()
  const logout = useLogout()
  const { theme, toggleTheme } = useThemeStore()
  const branches = useBranchAccess()
  const { userId, branchId } = useBranchSelectionStore()
  const activeBranch = userId === user?.id ? branches.data?.find((b) => b.id === branchId) : undefined
  const role = user?.role

  return (
    <aside className="w-[268px] bg-sidebar border border-sidebar-border rounded-2xl h-full flex flex-col shrink-0 shadow-xs overflow-hidden select-none">
      {/* Pinned Top Header: Boutique Atelier Brand */}
      <div className="p-4 pb-3.5 shrink-0 border-b border-sidebar-border/60 bg-sidebar/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Architectural Monogram Emblem */}
            <div className="size-8 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm flex items-center justify-center shadow-xs ring-1 ring-primary/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-[0.24em] uppercase text-foreground">
                  PRIVÉ
                </span>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Studio Management
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Locked Scroll Area */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-4 custom-scrollbar">
        {/* Workspace Domain */}
        <div>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.16em]">
            Workspace
          </p>
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="size-4" />} onClick={onCloseMobile}>
              Dashboard
            </NavItem>
            <NavItem to="/pos" icon={<Store className="size-4" />} onClick={onCloseMobile}>
              POS Terminal
            </NavItem>
            <NavItem to="/contacts" icon={<Users className="size-4" />} onClick={onCloseMobile}>
              Contacts
            </NavItem>
            <NavItem to="/wallets" icon={<Wallet className="size-4" />} onClick={onCloseMobile}>
              Wallets
            </NavItem>
            <NavItem to="/my-wallet" icon={<Wallet className="size-4" />} onClick={onCloseMobile}>
              My Wallet
            </NavItem>
          </div>
        </div>

        {/* Operations Domain */}
        <div>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.16em]">
            Operations
          </p>
          <div className="space-y-0.5">
            {/* Sales Module */}
            <NavGroup
              label="Sales"
              icon={<ShoppingBag className="size-4" />}
              activePrefixes={['/sales']}
            >
              <SubNavItem to="/pos" onClick={onCloseMobile}>POS Terminal</SubNavItem>
              <SubNavItem to="/sales/services" onClick={onCloseMobile}>Services</SubNavItem>
              <SubNavItem to="/sales/invoices" onClick={onCloseMobile}>Sales Invoices</SubNavItem>
            </NavGroup>

            {/* Purchase Module */}
            <NavGroup
              label="Purchases"
              icon={<ShoppingCart className="size-4" />}
              activePrefixes={['/purchases']}
            >
              <SubNavItem to="/purchases/invoices" onClick={onCloseMobile}>Purchase Invoices</SubNavItem>
            </NavGroup>

            {/* Inventory Module */}
            <NavGroup
              label="Inventory"
              icon={<Package className="size-4" />}
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

        {/* Financials Domain */}
        <div>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.16em]">
            Financials
          </p>
          <div className="space-y-0.5">
            {/* Accounting Module */}
            <NavGroup
              label="Accounting"
              icon={<BookOpen className="size-4" />}
              activePrefixes={['/accounting']}
            >
              <SubNavItem to="/accounting/chart" onClick={onCloseMobile}>Chart of Accounts</SubNavItem>
              <SubNavItem to="/accounting/journal" onClick={onCloseMobile}>Journal Entries</SubNavItem>
              <SubNavItem to="/accounting/ledger" onClick={onCloseMobile}>General Ledger</SubNavItem>
              <SubNavItem to="/accounting/trial-balance" onClick={onCloseMobile}>Trial Balance</SubNavItem>
              <SubNavItem to="/accounting/currencies" onClick={onCloseMobile}>Currencies</SubNavItem>
            </NavGroup>

            {/* Finance Module */}
            <NavGroup
              label="Finance"
              icon={<Banknote className="size-4" />}
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

        {/* Management Domain */}
        <div>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.16em]">
            Management
          </p>
          <div className="space-y-0.5">
            <NavItem to="/users" icon={<Users className="size-4" />} onClick={onCloseMobile}>
              Users
            </NavItem>
            <NavItem to="/reports" icon={<BarChart3 className="size-4" />} onClick={onCloseMobile}>
              Reports
            </NavItem>

            {/* Settings Module */}
            <NavGroup
              label="Settings"
              icon={<Settings className="size-4" />}
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

      {/* Pinned Bottom Footer: User Info with Branch Selector Popover */}
      <div className="p-2.5 border-t border-sidebar-border/60 bg-sidebar/70 shrink-0">
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger
              className="flex-1 min-w-0 flex items-center gap-2.5 p-1.5 rounded-xl text-start hover:bg-sidebar-accent/70 transition-all group outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              aria-label="User profile and branch selector"
            >
              {user ? (
                <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0 shadow-2xs">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              ) : isPending ? (
                <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
              ) : null}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.username ?? 'User'}
                  </p>
                  <span className="text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.2 rounded-sm bg-primary/10 text-primary border border-primary/15 shrink-0">
                    {role ?? 'Staff'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Building2 className="size-3 shrink-0 text-amber-500" />
                  <span className="truncate">
                    {activeBranch
                      ? `${activeBranch.code} — ${activeBranch.name}`
                      : branches.isPending
                        ? 'Loading…'
                        : 'Select branch'}
                  </span>
                  <ChevronsUpDown className="size-3 text-muted-foreground/60 shrink-0 ml-auto group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="start"
              sideOffset={10}
              className="w-[264px] p-3.5 bg-popover text-popover-foreground border border-border/80 shadow-lg rounded-xl space-y-3 z-50 backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/50">
                <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0 shadow-2xs">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.username ?? 'User'}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{role ?? 'Staff'}</p>
                </div>
              </div>

              {/* Branch Selector integrated into Popover */}
              <div>
                <BranchSelector />
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            </button>

            {/* Logout Action */}
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  to,
  icon,
  children,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
          isActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('shrink-0 transition-transform duration-150', isActive ? 'scale-105' : 'group-hover:scale-105')}>
            {icon}
          </span>
          <span className="truncate">{children}</span>
          {isActive && (
            <span className="ml-auto size-1.5 rounded-full bg-amber-400 shrink-0 shadow-xs" />
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
          'group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 w-full',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'size-1.5 rounded-full shrink-0 transition-colors',
              isActive ? 'bg-primary ring-2 ring-primary/20' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60'
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
  children,
  activePrefixes = [],
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  activePrefixes?: string[]
}) {
  const location = useLocation()
  const isCurrentlyInGroup = activePrefixes.some((prefix) => location.pathname.startsWith(prefix))
  const [userToggled, setUserToggled] = useState<boolean | null>(null)

  // If user explicitly toggled, respect their choice; otherwise auto-open when route matches
  const isOpen = userToggled ?? isCurrentlyInGroup

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setUserToggled(!isOpen)}
        className={cn(
          'group flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150',
          isCurrentlyInGroup
            ? 'text-foreground font-semibold bg-sidebar-accent/40'
            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 transition-transform group-hover:scale-105">
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground/70 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      {isOpen && (
        <div className="pl-3.5 space-y-0.5 border-l border-sidebar-border/70 ml-4 py-0.5">
          {children}
        </div>
      )}
    </div>
  )
}
