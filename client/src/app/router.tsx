import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { 
  MoneyAccountsPage,
  MoneyLedgerPage,
  ExchangeRatesPage,
  MoneyTransfersPage,
  SupplierPaymentsPage,
  CustomerReceiptsPage,
  CustomerReceiptPage,
} from '@/features/finance'
import { 
  AccountingDashboard, 
  ChartOfAccountsPage, 
  JournalEntriesPage, 
  CreateJournalEntryPage,
  CurrenciesPage,
  GeneralLedgerPage,
  TrialBalancePage,
} from '@/features/accounting'
import { 
  ServicesPage,
  SalesInvoicesPage, 
  CreateSalesInvoicePage
} from '@/features/sales'
import { 
  PurchaseInvoicePage,
  PurchaseInvoicesPage, 
} from '@/features/purchases'
import { ItemsPage, CreateItemPage, WarehousesPage } from '@/features/settings'
import { AdjustmentDocumentPage, AdjustmentsListPage, InventoryOverviewPage, MovementHistoryPage, OpeningStockDocumentPage, OpeningStockListPage, ProductsPage, TransferDocumentPage, TransfersListPage, CategoriesPage, UnitsPage, WarehousesPage as InventoryWarehousesPage } from '@/features/inventory'
import { BranchesPage, BusinessSettingsPage as BaseBusinessSettingsPage, CurrenciesPage as BaseCurrenciesPage } from '@/features/business'
import { ContactsPage } from '@/features/contacts'
import { PosPage, PosReceiptPage } from '@/features/pos'

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
          { path: '/contacts', element: <ContactsPage /> },
          { path: '/pos', element: <PosPage /> },
          { path: '/pos/sales/:id', element: <PosReceiptPage /> },
          
          // Finance
          { path: '/finance', element: <Navigate to="/finance/money-accounts" replace /> },
          { path: '/finance/money-accounts', element: <MoneyAccountsPage /> },
          { path: '/finance/money-ledger', element: <MoneyLedgerPage /> },
          { path: '/finance/exchange-rates', element: <ExchangeRatesPage /> },
          { path: '/finance/transfers', element: <MoneyTransfersPage /> },
          { path: '/finance/supplier-payments', element: <SupplierPaymentsPage /> },
          { path: '/finance/customer-receipts', element: <CustomerReceiptsPage /> },
          { path: '/finance/customer-receipts/new', element: <CustomerReceiptPage /> },
          { path: '/finance/customer-receipts/:id', element: <CustomerReceiptPage /> },

          // Accounting
          { path: '/accounting', element: <AccountingDashboard /> },
          { path: '/accounting/chart', element: <ChartOfAccountsPage /> },
          { path: '/accounting/journal', element: <JournalEntriesPage /> },
          { path: '/accounting/journal/new', element: <CreateJournalEntryPage /> },
          { path: '/accounting/currencies', element: <CurrenciesPage /> },
          { path: '/accounting/ledger', element: <GeneralLedgerPage /> },
          { path: '/accounting/trial-balance', element: <TrialBalancePage /> },

          // Sales
          { path: '/sales', element: <Navigate to="/sales/invoices" replace /> },
          { path: '/sales/services', element: <ServicesPage /> },
          { path: '/sales/invoices', element: <SalesInvoicesPage /> },
          { path: '/sales/invoices/new', element: <CreateSalesInvoicePage /> },
          { path: '/sales/invoices/:id', element: <CreateSalesInvoicePage /> },

          // Purchases
          { path: '/purchases', element: <Navigate to="/purchases/invoices" replace /> },
          { path: '/purchases/invoices', element: <PurchaseInvoicesPage /> },
          { path: '/purchases/invoices/new', element: <PurchaseInvoicePage /> },
          { path: '/purchases/invoices/:id', element: <PurchaseInvoicePage /> },

          // Settings
          { path: '/settings/business', element: <BaseBusinessSettingsPage /> },
          { path: '/settings/branches', element: <BranchesPage /> },
          { path: '/settings/currencies', element: <BaseCurrenciesPage /> },
          { path: '/settings/items', element: <ItemsPage /> },
          { path: '/settings/items/new', element: <CreateItemPage /> },
          { path: '/settings/warehouses', element: <WarehousesPage /> },
          { path: '/inventory', element: <InventoryOverviewPage /> },
          { path: '/inventory/opening-stock', element: <OpeningStockListPage /> },
          { path: '/inventory/opening-stock/new', element: <OpeningStockDocumentPage /> },
          { path: '/inventory/opening-stock/:id', element: <OpeningStockDocumentPage /> },
          { path: '/inventory/adjustments', element: <AdjustmentsListPage /> },
          { path: '/inventory/adjustments/new', element: <AdjustmentDocumentPage /> },
          { path: '/inventory/adjustments/:id', element: <AdjustmentDocumentPage /> },
          { path: '/inventory/transfers', element: <TransfersListPage /> },
          { path: '/inventory/transfers/new', element: <TransferDocumentPage /> },
          { path: '/inventory/transfers/:id', element: <TransferDocumentPage /> },
          { path: '/inventory/ledger', element: <MovementHistoryPage /> },
          { path: '/inventory/products', element: <ProductsPage /> },
          { path: '/inventory/categories', element: <CategoriesPage /> },
          { path: '/inventory/units', element: <UnitsPage /> },
          { path: '/inventory/warehouses', element: <InventoryWarehousesPage /> },
        ],
      },
    ],
  },
])
