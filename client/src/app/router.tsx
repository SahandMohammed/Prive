import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { 
  FinanceDashboard, 
  TreasuryPage, 
  VouchersPage, 
  InternalTransfersPage 
} from '@/features/finance'
import { 
  AccountingDashboard, 
  ChartOfAccountsPage, 
  JournalEntriesPage, 
  CurrenciesPage 
} from '@/features/accounting'
import { 
  SalesDashboard, 
  SalesInvoicesPage, 
  SalesReturnsPage, 
  POSPage,
  CreateSalesInvoicePage
} from '@/features/sales'
import { 
  PurchasesDashboard, 
  PurchaseInvoicesPage, 
  PurchaseReturnsPage 
} from '@/features/purchases'
import { ItemsPage, CreateItemPage } from '@/features/settings'

// ---------------------------------------------------------------------------
// Route structure
//
//  /                    → redirect to /dashboard
//  /login               → LoginPage (public only — redirects to /dashboard if authed)
//  /dashboard           → protected placeholder (replace with DashboardPage)
//
// To add a new protected page:
//   1. Create the page component in features/<name>/pages/
//   2. Export it from features/<name>/index.ts
//   3. Import and add it under the ProtectedRoute children array below
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // Root redirect — always send / to /dashboard
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Public-only routes (redirect to /dashboard if already authenticated)
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },

  // Protected routes (redirect to /login if not authenticated)
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          
          // Finance
          { path: '/finance', element: <FinanceDashboard /> },
          { path: '/finance/treasury', element: <TreasuryPage /> },
          { path: '/finance/vouchers', element: <VouchersPage /> },
          { path: '/finance/transfers', element: <InternalTransfersPage /> },

          // Accounting
          { path: '/accounting', element: <AccountingDashboard /> },
          { path: '/accounting/chart', element: <ChartOfAccountsPage /> },
          { path: '/accounting/journal', element: <JournalEntriesPage /> },
          { path: '/accounting/currencies', element: <CurrenciesPage /> },

          // Sales
          { path: '/sales', element: <SalesDashboard /> },
          { path: '/sales/invoices', element: <SalesInvoicesPage /> },
          { path: '/sales/invoices/new', element: <CreateSalesInvoicePage /> },
          { path: '/sales/returns', element: <SalesReturnsPage /> },
          { path: '/sales/pos', element: <POSPage /> },

          // Purchases
          { path: '/purchases', element: <PurchasesDashboard /> },
          { path: '/purchases/invoices', element: <PurchaseInvoicesPage /> },
          { path: '/purchases/returns', element: <PurchaseReturnsPage /> },

          // Settings
          { path: '/settings/items', element: <ItemsPage /> },
          { path: '/settings/items/new', element: <CreateItemPage /> },
        ],
      },
    ],
  },
])
