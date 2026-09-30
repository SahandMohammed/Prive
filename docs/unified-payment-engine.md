# Unified Payment Engine

**Status:** implemented and verified locally on 2026-09-30.

This document is the implementation guide and maintenance contract for Privé's
customer-payment architecture. It describes the code that is currently in the
repository, the invariants every writer must preserve, and the fresh-database
cutover required to release it.

The implementation deliberately has no compatibility layer for historical
customer collections. There is no transaction backfill, dual-read, legacy
settlement fallback, deprecated settlement DTO, or alternate CustomerReceipt or
POS collection-accounting path.

## Ownership model

```text
Customer
├── SalesInvoice                         receivable and sale truth
│   └── PaymentAllocation[]              settlement distribution
│       └── Payment                      net customer collection
│           ├── PaymentMoneyLine[]       physical MoneyAccount movements
│           │   └── MoneyLedger          generated account movements
│           └── Journal                  generated accounting entry
├── CustomerReceipt
│   └── Payment                          posted manual-receipt state
└── CustomerAccountReader                derived account projection

PosSale                                  operational checkout context
├── SalesInvoice
├── Payment?
├── PosTender[]
├── PosChange?
├── Session
├── Cashier
└── Idempotency identity

Refund                                   independent refund/payout/stock flow
```

The boundaries are intentional:

- `SalesInvoice` says what was sold and owns the receivable.
- `Payment` says how much customer receivable was settled.
- `PaymentAllocation` says which invoice or invoices were settled.
- `PaymentMoneyLine` says which Money Accounts physically moved.
- `MoneyLedger` is the generated Money Account effect of a money line.
- `CustomerReceipt` is a draft voucher that produces a Payment when posted.
- `PosSale`, `PosTender`, and `PosChange` remain the drawer, session, receipt,
  idempotency, and X/Z reporting truth.
- `CustomerAccountReader` derives customer balances; it does not store them.
- `Refund` remains a separate business transaction.

`PosSale` is not replaced by a new POS context in this implementation.

## Payment invariants

### Net settlement versus physical money

`Payment.Amount` is the net amount applied to customer receivables. It is not the
sum of tender face values.

```text
Payment.Amount
    = SUM(active PaymentAllocation.Amount)

Payment.BaseAmount
    = SUM(active PaymentAllocation.BaseAmount)

Payment.BaseAmount
    = SUM(Collection PaymentMoneyLine.BaseAmount)
      - SUM(Change PaymentMoneyLine.BaseAmount)
```

Money-line amounts are always positive. `PaymentMoneyDirection.Collection` and
`PaymentMoneyDirection.Change` provide the sign. Each money line owns its own
Money Account, currency, amount, exchange rate, and base amount. Payment has an
allocation currency and net amounts, but no payment-level exchange rate.

For example, a POS checkout with an IQD 18,000 invoice, IQD 20,000 tender, and
IQD 2,000 change produces:

```text
Payment.Amount:                          18,000
PaymentMoneyLine Collection:            20,000
PaymentMoneyLine Change:                 2,000
Signed money-line total:                18,000
```

A normal direct or receipt payment of IQD 20,000 produces a Payment for IQD
20,000 and one IQD 20,000 Collection money line.

### Allocation ownership

Every active allocation must satisfy:

```text
allocation.SalesInvoice.CustomerId = payment.CustomerId
allocation.SalesInvoice.BranchId   = payment.BranchId
allocation.SalesInvoice.CurrencyId = payment.CurrencyId
```

Additional rules are enforced by `PaymentService` inside the same transaction
that creates or replaces the financial effects:

- allocations cannot cross customers, branches, or allocation currencies;
- a SalesInvoice-origin Payment has exactly one allocation to its source invoice;
- a POS-origin Payment has exactly one allocation to its POS invoice;
- a CustomerReceipt-origin Payment may allocate to several invoices, but every
  invoice must belong to the receipt customer;
- customer, branch, allocation currency, origin, and source identity do not
  change after Payment creation;
- an invoice with active allocations cannot change customer, branch, or currency.

Cross-table ownership equality is a service invariant rather than duplicated
columns on `PaymentAllocation`. Database constraints still enforce positive
amounts, origin/source shape, allocation uniqueness, money-line ordering, ledger
ownership, Payment journal state, and soft-delete metadata.

### Origin-specific shapes

| Origin | Allocation shape | Money-line shape | Mutation owner |
| --- | --- | --- | --- |
| `SalesInvoice` | Exactly one, to `SourceSalesInvoiceId` | Exactly one Collection line | Invoice-scoped Payment API |
| `CustomerReceipt` | One or more invoices for the receipt customer | One Collection line | CustomerReceipt workflow |
| `Pos` | Exactly one, to the POS invoice | Tender Collections plus optional Change | POS workflow |

Multiple accounts on a direct invoice are represented by multiple Payments. A
single POS checkout is different: it creates at most one Payment containing all
tender and change money lines.

## Data model

### Payment

`PaymentEntity` stores:

- immutable `PAY-######` document number;
- branch and customer;
- payment date and allocation currency;
- net native and base amounts;
- origin and optional source SalesInvoice;
- Payment-owned journal relation;
- notes, creator, creation time, and optimistic-concurrency timestamp;
- soft-delete timestamp, actor, and reason;
- allocations and money lines.

An active Payment must own a journal. A deleted Payment must not retain a journal
or active financial children. Global query filters exclude soft-deleted Payments
and consequently exclude their removed settlement effects from ordinary reads.

### PaymentAllocation

`PaymentAllocationEntity` stores Payment ID, SalesInvoice ID, native amount, and
base amount. A Payment/invoice pair is unique. Both amounts must be positive.

### PaymentMoneyLine

`PaymentMoneyLineEntity` stores:

- Payment ID and one-based sequence;
- Money Account and that account's currency;
- positive native amount;
- independent exchange rate and base amount;
- Collection or Change direction;
- a unique generated MoneyLedger entry.

### PAY numbering

`PaymentDocumentCounterEntity` is a dedicated singleton counter seeded with
`NextValue = 1`. PostgreSQL increments it atomically with `UPDATE ... RETURNING`
inside the posting transaction. Payment numbers are protected by a unique index
and begin at `PAY-000001` on a fresh database.

SI, POS, and REC numbering are unchanged.

## Settlement projection

`InvoiceSettlementReader` is the only invoice-settlement projection. It reads
active `PaymentAllocation` rows and posted POS refund AR reductions only:

```text
CollectedAmount
    = SUM(PaymentAllocation.Amount)

ReceivableReductionAmount
    = SUM(posted refund ReceivableReversalBase / invoice ExchangeRate)

EffectiveReceivable
    = MAX(Invoice.Total - ReceivableReductionAmount, 0)

OutstandingAmount
    = MAX(EffectiveReceivable - CollectedAmount, 0)

OverpaidAmount
    = MAX(CollectedAmount - EffectiveReceivable, 0)
```

The same calculation is performed in base currency from `BaseTotal`, allocation
base amounts, and `ReceivableReversalBase`.

There is no fallback to CustomerReceipt allocations, POS tender/change, or old
invoice received fields. Sales and Finance projections consume this reader; POS
operational views use the same allocation/refund sources.

Invoice correction does not rewrite money truth. If an invoice is reduced from
50,000 to 45,000 after a 50,000 Payment, the result remains 50,000 collected,
zero outstanding, and 5,000 overpaid.

## Customer account projection

`CustomerAccountReader` is a Finance query service. No `Customer.Balance` column
or customer-account aggregate exists.

For each currency and for the business base currency:

```text
CustomerReceivable = SUM(invoice EffectiveReceivable)
CustomerCollected  = SUM(active allocations to those invoices)
CustomerNetBalance = CustomerReceivable - CustomerCollected
Outstanding        = MAX(CustomerNetBalance, 0)
Credit             = MAX(-CustomerNetBalance, 0)
```

A positive net balance means the customer owes Privé. A negative balance means
Privé owes the customer or the customer has credit. Native values are grouped by
currency and are never summed across currencies. The top-level result is the
base-currency total.

### Summary

`GetSummaryAsync` returns customer identity, base currency, total receivable,
total collected, signed net balance, outstanding, credit, and an equivalent
breakdown for every invoice currency.

### Statement

`GetStatementAsync` reconstructs current corrected document truth with:

- Invoice entries: positive base-balance impact;
- Payment entries: negative impact, aggregated from that Payment's allocations
  to the customer;
- refund receivable adjustments: negative impact for the AR-reversal portion;
- no entry for a cash-only refund portion.

Entries are ordered by event date, creation timestamp, entry-type rank, and source
ID. The rank makes an invoice precede its embedded Payment when both are created
together.

The requested dates are inclusive. Pagination computes the opening balance before
`fromDate`, applies the impact of range entries skipped by earlier pages, returns
the running balance for the requested page, and reports the closing balance for
the complete range. Historical correction snapshots belong to `ActivityLog`; the
statement itself shows current document truth.

## Write workflows

### Direct invoice Payment

The public business action is "add a payment to this invoice," so direct writes
are invoice-scoped:

```text
POST   /api/v1/sales/invoices/{invoiceId}/payments
PUT    /api/v1/sales/invoices/{invoiceId}/payments/{paymentId}
DELETE /api/v1/sales/invoices/{invoiceId}/payments/{paymentId}
```

Create accepts `paymentDate`, `moneyAccountId`, `amount`, optional
`exchangeRate`, and optional `notes`. Update accepts the same values plus a
required correction `reason` and `expectedUpdatedAtUtc`. Delete requires `reason`
and `expectedUpdatedAtUtc`.

Creation cannot exceed current outstanding. A later invoice correction may make
an existing Payment overpaid; a Payment correction may retain or reduce that
overpayment, but cannot increase it.

Only SalesInvoice-origin Payments can use these endpoints. The route invoice,
Payment source invoice, Payment customer, and current branch must all agree.

### Direct correction and deletion

Payment correction updates the same aggregate:

```text
snapshot old Payment and effects
→ validate timestamp, origin, source, ownership, and refund dependency
→ remove allocations, money lines, journal, and ledgers
→ update the Payment
→ regenerate allocations, journal, money lines, and ledgers
→ write before/after ActivityLog with reason
→ commit atomically
```

Deletion follows the same validation and snapshot process, removes active
financial effects, soft-deletes the Payment, and records the reason and actor.

There is no reversal Payment, replacement Payment, or correction chain.
Correction/deletion is blocked when a posted refund depends on an allocated
invoice. `UpdatedAtUtc` is an EF concurrency token and must exactly match the
client's expected timestamp.

### CustomerReceipt

A draft CustomerReceipt owns only voucher data and
`CustomerReceiptDraftAllocation` rows. Posting runs in one transaction:

```text
validate receipt customer and every target invoice
→ create one CustomerReceipt-origin Payment
→ create PaymentAllocation[]
→ create one Collection PaymentMoneyLine
→ create Payment journal and MoneyLedger
→ set CustomerReceipt.PaymentId
→ delete draft allocation rows
→ mark receipt Posted
```

Posted receipt reads use Payment exclusively. Posted receipt correction and
deletion delegate to the Payment replacement/deletion primitives while preserving
the CustomerReceipt as the owning workflow. A posted receipt must have no draft
allocations.

### SalesInvoice embedded Payments

Invoice creation can include zero or more embedded direct Payments. Each embedded
entry becomes its own SalesInvoice-origin Payment with one allocation and one
Collection money line. The final invoice response includes required customer,
collected amount, receivable reduction, outstanding, overpaid, payment status,
unified Payment history, and optional POS context.

Invoice correction remains independent from Payment. Invoice deletion is blocked
while active allocations exist.

### POS checkout

Checkout is atomic:

```text
resolve selected customer or branch Walk-in Customer
→ create SalesInvoice and full-AR sale journal
→ create PosSale
→ create PosTender[] and optional PosChange
→ if net settlement > 0, create one POS-origin Payment
→ allocate it only to the POS SalesInvoice
→ derive PaymentMoneyLine[] from tenders and change
→ create Payment journal and MoneyLedger[]
→ create stock effects
→ commit
```

A credit-only checkout creates no Payment. Tender and change remain authoritative
for session drawer reconciliation, receipts, and X/Z reports. The POS retry key
and fingerprint remain the idempotency boundary.

POS correction uses the POS workflow to replace the owned Payment atomically.
Deletion soft-deletes the Payment with the sale. Closed-session correction keeps
the original Z-report identity. Refund continues through its independent refund,
payout, stock, journal, and ledger flow.

## Accounting contracts

### Sale

```text
Dr Accounts Receivable
    Cr Revenue

Dr Cost of Goods Sold
    Cr Inventory
```

The invoice journal always records the full receivable, including POS sales.

### Payment

```text
Dr MoneyAccount                 Collection money lines
Cr MoneyAccount                 Change money lines
    Cr Accounts Receivable      allocated net amount
```

When allocations point to invoices with different AR accounts, the journal
groups AR credits by invoice AR account. Total AR credit equals
`Payment.BaseAmount`, and every Payment journal must balance.

Active customer-collection ledgers use only:

```text
PaymentMoneyLine → MoneyLedgerSourceType.Payment
```

CustomerReceipt and PosSale do not own collection ledger entries. Refund ledgers
continue to use `MoneyLedgerSourceType.PosRefund`.

## Public read APIs

All responses use the standard `ApiResponse<T>` envelope.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/finance/payments/{paymentId}` | Read any Payment origin for audit and navigation. |
| `GET` | `/api/v1/finance/customers/{customerId}/account-summary` | Read derived base and per-currency balances. |
| `GET` | `/api/v1/finance/customers/{customerId}/statement?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&pageNumber=1&pageSize=25` | Read the paginated customer statement. |

Payment responses include source metadata, allocation and money-line details,
journal identity, audit timestamps, and the concurrency timestamp. Payment GET
does not expose deleted Payments through the active query.

The Finance Payment and customer-account reads use the Finance controller's
`SuperAdmin`, `Manager`, `Owner`, and `Cashier` role boundary. Direct Payment
writes use the Sales controller's `SuperAdmin` and `Manager` boundary. Existing
Money Account access checks still apply to every write.

## Walk-in Customer

Every invoice has a customer. `Branch.WalkInCustomerId` is required and points to
a protected customer contact with `ContactSystemRole.WalkInCustomer`.

The provisioner creates the shared/catalog system contact, and branch creation
assigns the branch's valid Walk-in Customer. System contacts are hidden from
ordinary selectable contact lists and cannot be edited, deactivated, or deleted.
They remain administratively queryable through the customer-account endpoints.

Writers apply these rules:

- fully paid anonymous POS checkout may resolve to the branch Walk-in Customer;
- manual invoices and CustomerReceipts reject a system customer;
- partial and credit POS sales require a real customer.

## Branch scope and validation errors

EF global query filters scope Payments, allocations, money lines, invoices,
receipts, POS records, journals, and ledgers to the current branch. Mutation
services still validate referenced rows explicitly before writing.

The main typed error codes are:

```text
FINANCE_CUSTOMER_PAYMENT_NOT_FOUND
FINANCE_PAYMENT_CUSTOMER_MISMATCH
FINANCE_PAYMENT_BRANCH_MISMATCH
FINANCE_PAYMENT_CURRENCY_MISMATCH
FINANCE_PAYMENT_SOURCE_INVOICE_MISMATCH
FINANCE_PAYMENT_MONEY_LINES_INVALID
FINANCE_PAYMENT_MONEY_LINES_UNBALANCED
FINANCE_PAYMENT_ALLOCATION_EXCEEDS_OUTSTANDING
FINANCE_PAYMENT_RECEIVABLE_ACCOUNT_MISSING
FINANCE_PAYMENT_HAS_REFUND_DEPENDENCY
FINANCE_PAYMENT_CONCURRENCY_CONFLICT
FINANCE_CUSTOMER_ACCOUNT_DATE_RANGE_INVALID
CONTACT_SYSTEM_PROTECTED
SALES_INVOICE_HAS_PAYMENT
```

Controllers do not construct error bodies. Services throw the centralized typed
exceptions and the global exception handler formats the response.

## Frontend integration

Finance exports the Payment detail page and customer-account panel through its
public `index.ts` boundary.

- `/finance/payments/:paymentId` shows Payment, allocations, money lines, journal,
  and origin navigation.
- `/finance/customers/:customerId/account` shows outstanding/credit state, base
  totals, per-currency totals, date filters, paginated statement entries, and
  running balances.
- Sales Invoice Payment history links to the Payment detail page.
- Contacts and CustomerReceipt surfaces link to the customer account.
- Payment source links return to Sales Invoice, CustomerReceipt, or POS receipt;
  ledger rows can navigate to Payment.

TanStack Query owns all server state. The Sales, Payment, CustomerReceipt, POS,
and refund mutation hooks invalidate Finance customer-account queries so balances
and statements are refetched instead of copied into client state.

## Important implementation locations

| Concern | Location |
| --- | --- |
| Payment aggregate and commands | `Api/Modules/Finance/PaymentService.cs` |
| Settlement formulas | `Api/Modules/Finance/InvoiceSettlementReader.cs` |
| Customer summary and statement | `Api/Modules/Finance/CustomerAccountReader.cs` |
| Payment/receipt/account HTTP endpoints | `Api/Modules/Finance/FinanceController.cs` |
| Invoice-scoped Payment endpoints | `Api/Modules/Sales/SalesController.cs` |
| Finance entities and constraints | `Api/Modules/Finance/Entities/FinanceEntity.cs`, `FinanceEntityConfiguration.cs` |
| Receipt workflow | `Api/Modules/Finance/FinanceService.cs` |
| POS settlement writer | `Api/Modules/Pos/PosSettlementService.cs` |
| POS checkout/correction orchestration | `Api/Modules/Pos/PosService.cs` |
| Invoice correction guards | `Api/Modules/Sales/SalesInvoiceCorrectionService.cs` |
| Walk-in provisioning | `Api/Modules/Contact/WalkInCustomerProvisioner.cs` |
| Frontend Finance API and queries | `client/src/features/finance/api/finance.api.ts`, `hooks/useFinance.ts` |
| Customer account UI | `client/src/features/finance/components/CustomerAccountPanel.tsx` |
| Payment UI | `client/src/features/finance/pages/PaymentPage.tsx` |

## Database and release procedure

The schema is defined by these migrations after the previously existing chain:

1. `20260930125119_UnifiedPaymentEngine`
2. `20260930134110_PaymentDeletionJournalLifecycle`
3. `20260930135142_RequireFinalZReportNetSales`

These are schema migrations for the final model, not historical transaction data
migrations. Do not treat this release as an in-place compatibility upgrade for a
database containing old CustomerReceipt or POS collection history.

`20260930125119_UnifiedPaymentEngine` explicitly stops before any schema change
when it finds legacy invoices, receipts, POS sales, or branches. This prevents a
partial destructive migration and reports that the database must be reset. It
does not manufacture a zero-GUID customer or leave a zero-GUID default on either
`SalesInvoice.CustomerId` or `Branch.WalkInCustomerId`.

The required cutover is:

1. Complete and approve the API and client as one coordinated release.
2. Stop the target environment and confirm the database target.
3. Drop and recreate the database according to the environment's backup policy.
4. Apply the full EF migration chain.
5. Run the normal seeders; they provision the protected Walk-in Customer.
6. Ensure each created branch has its required Walk-in Customer relation.
7. Deploy API and web client together.
8. Run the financial smoke tests below before normal use.

The repository verification does not perform the destructive database reset.
That is an explicit deployment operation against the selected environment.

## Verification

The implementation has automated coverage for:

- same-customer allocation success and cross-customer rejection;
- branch, currency, and source-invoice mismatch rejection;
- direct Payment create, correction, concurrency, refund dependency, and delete;
- receipt multi-invoice posting and draft-allocation removal;
- invoice unpaid, partial, paid, multiple-payment, and overpaid states;
- Walk-in paid POS and real-customer partial/credit POS;
- one POS Payment with multiple/mixed-currency tenders and change;
- POS retry conflicts, closed-session correction, deletion, and refunds;
- customer summary credit/outstanding and statement opening/running/closing;
- branch scoping and authorization;
- Payment journal, MoneyLedger, and PAY number ownership.

Use the standard verification commands:

```text
dotnet build Api/api.csproj --no-restore
dotnet test Api.Tests/Api.Tests.csproj --no-restore
pnpm --dir client test --run
pnpm --dir client lint
pnpm --dir client build
dotnet ef migrations has-pending-model-changes --project Api/api.csproj
```

The latest local run completed with 197 backend tests and 148 frontend tests.
The production client build succeeds with Vite's existing large-chunk advisory.

For a fresh-database smoke test, verify at minimum:

1. a manual invoice plus direct Payment and correction;
2. a multi-invoice CustomerReceipt and deletion;
3. paid Walk-in POS, partial real-customer POS, multi-tender POS, and over-tender
   change;
4. AR, cash-only, and mixed refund behavior;
5. journal balance and one ledger per active Payment money line;
6. invoice settlement and customer summary/statement agreement;
7. X/Z and drawer totals still derived from tender and change;
8. concurrent PAY creation produces unique sequential document numbers.

## Maintenance rules

When adding a new customer-collection path:

1. call `PaymentService`; do not write allocations, journals, or ledgers in the
   caller;
2. state the Payment origin and exact source identity;
3. preserve customer, branch, and allocation-currency equality;
4. pass physical movements as independent money-line commands;
5. keep operational source data separate from settlement accounting;
6. invalidate affected invoice and customer-account queries;
7. add ownership, accounting, correction, branch-scope, and concurrency tests.

Do not add a stored customer balance, a payment-level exchange rate, a generic
free-floating Payment write endpoint, one POS Payment per tender, settlement
fallbacks, or CustomerReceipt/PosSale-owned collection accounting.
