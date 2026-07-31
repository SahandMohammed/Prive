import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboardIcon,
  WalletIcon,
  BarChart3Icon,
  UsersIcon,
  LogOutIcon,
  BanknoteIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@/features/auth'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { data: user, isPending } = useCurrentUser()
  const logout = useLogout()
  const role = user?.role

  if (isPending) {
    return (
      <aside className="w-64 bg-card border-r border-border h-full flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-heading font-bold text-foreground">Prive MVP</h1>
          <p className="text-xs text-muted-foreground mt-1">Management System</p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-muted-foreground">Loading menu...</p>
        </div>
      </aside>
    )
  }

  if (!user) return null

  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-heading font-bold text-foreground">Prive MVP</h1>
        <p className="text-xs text-muted-foreground mt-1">Management System</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto max-h-[calc(100vh-180px)]">
        <NavItem to="/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />}>
          Dashboard
        </NavItem>

        <NavItem to="/wallets" icon={<WalletIcon className="w-4 h-4" />}>
          Wallets
        </NavItem>

        <NavItem to="/my-wallet" icon={<WalletIcon className="w-4 h-4" />}>
          My Wallet
        </NavItem>

        {/* Sales Module */}
        <NavGroup label="Sales" icon={<ShoppingBagIcon className="w-4 h-4" />}>
          <SubNavItem to="/sales/invoices">Sales Invoice</SubNavItem>
          <SubNavItem to="/sales/returns">Sales Return</SubNavItem>
          <SubNavItem to="/sales/pos">POS</SubNavItem>
        </NavGroup>

        {/* Purchase Module */}
        <NavGroup label="Purchases" icon={<ShoppingCartIcon className="w-4 h-4" />}>
          <SubNavItem to="/purchases/invoices">Purchase Invoice</SubNavItem>
          <SubNavItem to="/purchases/returns">Purchase Return</SubNavItem>
        </NavGroup>

        {/* Accounting Module */}
        <NavGroup label="Accounting" icon={<BookOpenIcon className="w-4 h-4" />}>
          <SubNavItem to="/accounting/chart">Chart of Accounts</SubNavItem>
          <SubNavItem to="/accounting/journal">Journal Entries</SubNavItem>
          <SubNavItem to="/accounting/currencies">Currencies</SubNavItem>
        </NavGroup>

        {/* Finance Module */}
        <NavGroup label="Finance" icon={<BanknoteIcon className="w-4 h-4" />}>
          <SubNavItem to="/finance/treasury">Treasury (Safes)</SubNavItem>
          <SubNavItem to="/finance/vouchers">Vouchers</SubNavItem>
          <SubNavItem to="/finance/transfers">Internal Transfer</SubNavItem>
        </NavGroup>

        {/* Other Admin Tools */}
        <div className="pt-2 border-t border-border/50 my-2">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Administration
          </p>
          <NavItem to="/users" icon={<UsersIcon className="w-4 h-4" />}>
            Users
          </NavItem>
          <NavItem to="/reports" icon={<BarChart3Icon className="w-4 h-4" />}>
            Reports
          </NavItem>
        </div>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOutIcon className="w-4 h-4" />
          {logout.isPending ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

function SubNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-full',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        )
      }
    >
      {children}
    </NavLink>
  )
}

function NavGroup({
  label,
  icon,
  children,
  defaultOpen = false,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDownIcon className="w-4 h-4 text-muted-foreground/70" /> : <ChevronRightIcon className="w-4 h-4 text-muted-foreground/70" />}
      </button>
      {isOpen && (
        <div className="pl-4 space-y-1 border-l border-border/50 ml-5">
          {children}
        </div>
      )}
    </div>
  )
}
