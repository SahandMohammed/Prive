import { NavLink } from 'react-router-dom'
import {
  LayoutDashboardIcon,
  WalletIcon,
  FileTextIcon,
  ReceiptIcon,
  BarChart3Icon,
  UsersIcon,
  LogOutIcon,
} from 'lucide-react'
import { useCurrentUser, useLogout } from '@/features/auth'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { data: user, isPending } = useCurrentUser()
  const logout = useLogout()
  const role = user?.role

  if (isPending) {
    return (
      <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col shrink-0">
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
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-heading font-bold text-foreground">Prive MVP</h1>
        <p className="text-xs text-muted-foreground mt-1">Management System</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        <NavItem to="/dashboard" icon={<LayoutDashboardIcon className="w-4 h-4" />}>
          Dashboard
        </NavItem>

        {(role === 'Owner' || role === 'Manager') && (
          <NavItem to="/wallets" icon={<WalletIcon className="w-4 h-4" />}>
            Wallets
          </NavItem>
        )}

        {role === 'Professional' && (
          <NavItem to="/my-wallet" icon={<WalletIcon className="w-4 h-4" />}>
            My Wallet
          </NavItem>
        )}

        <NavItem to="/invoices" icon={<FileTextIcon className="w-4 h-4" />}>
          Invoices
        </NavItem>

        {(role === 'Owner' || role === 'Manager') && (
          <>
            <NavItem to="/expenses" icon={<ReceiptIcon className="w-4 h-4" />}>
              Expenses
            </NavItem>
            <NavItem to="/reports" icon={<BarChart3Icon className="w-4 h-4" />}>
              Reports
            </NavItem>
            <NavItem to="/users" icon={<UsersIcon className="w-4 h-4" />}>
              Users
            </NavItem>
          </>
        )}
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
