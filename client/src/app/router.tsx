import { UsersPage } from '@/features/users'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { CapabilityRoute } from './CapabilityRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from './layout/AppLayout'
import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary'
import { NotFoundPage } from '@/components/layout/NotFoundPage'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import {
  MoneyAccountsPage,
  MoneyLedgerPage,
  ExchangeRatesPage,
  MoneyTransfersPage,
  SupplierPaymentsPage,
  SupplierPaymentPage,
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
import { ServicesPage, SalesInvoicesPage, CreateSalesInvoicePage } from '@/features/sales'
import { PurchaseInvoicePage, PurchaseInvoicesPage } from '@/features/purchases'
import { ItemsPage, CreateItemPage, WarehousesPage } from '@/features/settings'
import {
  AdjustmentDocumentPage,
  AdjustmentsListPage,
  InventoryOverviewPage,
  MovementHistoryPage,
  OpeningStockDocumentPage,
  OpeningStockListPage,
  ProductsPage,
  TransferDocumentPage,
  TransfersListPage,
  CategoriesPage,
  UnitsPage,
  WarehousesPage as InventoryWarehousesPage,
} from '@/features/inventory'
import {
  BranchesPage,
  BusinessSettingsPage as BaseBusinessSettingsPage,
  CurrenciesPage as BaseCurrenciesPage,
} from '@/features/business'
import { ContactsPage } from '@/features/contacts'
import { PosPage, PosReceiptPage, PosRefundReceiptPage, PosSessionClosePage, PosSessionsPage, PosZReportPage } from '@/features/pos'
import { ExpensesPage, ExpenseDetailPage, ExpenseCategoriesPage } from '@/features/expenses'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace />, errorElement: <RouteErrorBoundary /> },
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/contacts', element: <ContactsPage /> },

          {
            element: <CapabilityRoute capability="pos" />,
            children: [
              { path: '/pos', element: <PosSessionsPage /> },
              { path: '/pos/workspace', element: <PosPage /> },
              { path: '/pos/sessions', element: <Navigate to="/pos" replace /> },
              { path: '/pos/sessions/:id/close', element: <PosSessionClosePage /> },
              { path: '/pos/z-reports/:id', element: <PosZReportPage /> },
              { path: '/pos/sales/:id', element: <PosReceiptPage /> },
              { path: '/pos/refunds/:id', element: <PosRefundReceiptPage /> },
            ],
          },

          // Finance
          { path: '/finance', element: <Navigate to="/finance/money-accounts" replace /> },
          { path: '/finance/money-accounts', element: <MoneyAccountsPage /> },
          { path: '/finance/money-ledger', element: <MoneyLedgerPage /> },
          { path: '/finance/exchange-rates', element: <ExchangeRatesPage /> },
          { path: '/finance/transfers', element: <MoneyTransfersPage /> },
          { path: '/finance/supplier-payments', element: <SupplierPaymentsPage /> },
          { path: '/finance/supplier-payments/new', element: <SupplierPaymentPage /> },
          { path: '/finance/supplier-payments/:id', element: <SupplierPaymentPage /> },
          { path: '/finance/customer-receipts', element: <CustomerReceiptsPage /> },
          { path: '/finance/customer-receipts/new', element: <CustomerReceiptPage /> },
          { path: '/finance/customer-receipts/:id', element: <CustomerReceiptPage /> },

          // Expenses
          { path: '/expenses', element: <ExpensesPage /> },
          { path: '/expenses/new', element: <ExpenseDetailPage /> },
          { path: '/expenses/:id', element: <ExpenseDetailPage /> },
          { path: '/expenses/categories', element: <ExpenseCategoriesPage /> },

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
          { path: '/users', element: <UsersPage /> },
          { path: '/settings/branches', element: <BranchesPage /> },
          { path: '/settings/currencies', element: <BaseCurrenciesPage /> },
          { path: '/settings/items', element: <ItemsPage /> },
          { path: '/settings/items/new', element: <CreateItemPage /> },
          { path: '/settings/items/:id', element: <CreateItemPage /> },
          { path: '/settings/services', element: <ServicesPage /> },
          { path: '/settings/warehouses', element: <WarehousesPage /> },

          // Inventory
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

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage standalone />, errorElement: <RouteErrorBoundary /> },
])
