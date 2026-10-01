# Unified Sales, POS, and Payment Hardening

**Implementation status:** complete and locally verified on 2026-10-01.

This document records the final hardening work applied after the Unified Payment
Engine and the SalesInvoice-backed POS context were introduced. It is an
implementation record for maintainers: what changed, why it changed, which
contracts are now authoritative, how the changes were tested, and how to apply
the schema safely.

This work did not add compatibility reads, transaction backfills, deprecated DTO
fields, or alternate settlement paths. It did not reset a configured database or
merge the working branch into `main`.

## Final ownership boundary

```text
SalesInvoice
├── commercial sale and receivable truth
├── POS business identity and document number
├── derived PaymentStatus
└── PaymentAllocation[]
        └── Payment
            ├── PaymentMoneyLine[]
            │   └── MoneyLedger[]
            └── Payment Journal

PosContext (PK/FK = SalesInvoiceId)
├── historical checkout PaymentMode
├── session, cashier, and completion metadata
├── retry key and fingerprint
├── Payment?
├── PosTender[]
├── PosChange?
└── PosRefund[]
```

The two status concepts intentionally mean different things:

- `PosContext.PaymentMode` records how checkout was operationally completed. It
  is set during checkout and changes only through POS settlement correction.
- `SalesInvoice.PaymentStatus` is calculated from the current invoice truth,
  active Payment allocations, and posted refund AR reductions. It can change
  after a commercial invoice correction without changing checkout mode.

Examples:

```text
Checkout invoice:                 25,000
Checkout Payment:                 25,000
PosContext.PaymentMode:           Paid

Commercial correction:           30,000
CollectedAmount:                  25,000
SalesInvoice.PaymentStatus:       PartiallyPaid
OutstandingAmount:                 5,000
OverpaidAmount:                         0
PosContext.PaymentMode:           Paid (unchanged)
```

```text
Commercial correction:           20,000
CollectedAmount:                  25,000
SalesInvoice.PaymentStatus:       Overpaid
OutstandingAmount:                     0
OverpaidAmount:                    5,000
PosContext.PaymentMode:           Paid (unchanged)
```

The existing settlement-status semantics were preserved.

## Backend implementation

### Persisted checkout mode

`PosContextEntity` now stores required `PaymentMode` as a string enum. Checkout
sets it from the checkout request. Settlement correction updates it only after
validation and settlement reconstruction succeed.

POS list filtering and POS list/detail responses now read the stored checkout
mode. They no longer infer checkout mode by comparing current invoice total with
tender totals, because a later commercial correction would make that inference
historically incorrect.

### Centralized real-customer validation

The Partial/Credit customer rule now lives in `PosSettlementService`, which is
used by both initial checkout and settlement correction.

For `Partial` or `Credit`, the selected contact must:

- exist in the current branch scope;
- be active;
- have `IsCustomer = true`;
- have no system role.

Missing, inactive, non-customer, and Walk-in contacts all fail with:

```text
POS_REAL_CUSTOMER_REQUIRED
```

The validation occurs before Payment, tender/change, journal, MoneyLedger,
activity, or Z-report state is mutated. A Walk-in Paid checkout can be corrected
to another Paid settlement, but it cannot be changed to Partial or Credit.

### Commercial POS invoice correction

Normal SalesInvoice correction remains a commercial operation. For a POS
invoice, it does not update:

- `PosContext` identity or `PaymentMode`;
- session, cashier, completion, or idempotency metadata;
- Payment or PaymentAllocation;
- PaymentMoneyLine or MoneyLedger;
- PosTender or PosChange;
- the Payment journal.

POS invoice branch and currency remain immutable. Invoice date is now also
immutable and a change fails with:

```text
SALES_POS_INVOICE_DATE_IMMUTABLE
```

Changing invoice lines or totals rebuilds only the commercial invoice effects:
the receivable/revenue journal and any stock effects. Collected, outstanding,
overpaid, and Payment status are then recalculated by the existing settlement
reader. The Payment itself is not changed.

### Closed-session Z regeneration

When a POS invoice in a closed session is commercially corrected, the correction
transaction now:

1. loads the session and captures the existing Z identity;
2. removes the derived Z report and summaries;
3. rebuilds the invoice's commercial effects;
4. recreates the Z snapshot from current source truth;
5. preserves report ID and report number;
6. preserves closure time, closing actor, notes, and counted values;
7. recalculates sales totals, expected drawer values, and variances;
8. commits the invoice and replacement Z snapshot atomically.

If either the commercial rebuild or Z replacement fails, the transaction restores
the original invoice, journal, stock state, session closing state, and Z report.

### Combined invoice history

SalesInvoice history now returns activity rows whose entity type is either:

- `Sales Invoice`, exposed as source `Invoice`; or
- `POS Settlement`, exposed as source `POS Settlement`.

Both use the SalesInvoice ID. Rows are ordered by activity timestamp and then
activity ID, and existing activity rows are not copied or duplicated.

### Customer account statement

`CustomerAccountReader` explicitly excludes soft-deleted Payments from Payment
statement projections. Statement count, sums, deterministic ordering, preceding
page impact, `Skip`, and `Take` remain relational SQL operations. Only the
requested page and that page's Payment source metadata are materialized.

Relational tests capture the emitted SQL and assert translated `LIMIT`/`OFFSET`,
opening and closing balances, running balances across page boundaries, refund AR
reductions, deterministic order, and inactive-Payment exclusion.

### Direct and embedded invoice Payments

The existing invoice-scoped Payment API remains authoritative:

```text
POST   /api/v1/sales/invoices/{invoiceId}/payments
PUT    /api/v1/sales/invoices/{invoiceId}/payments/{paymentId}
DELETE /api/v1/sales/invoices/{invoiceId}/payments/{paymentId}
```

Direct and embedded SalesInvoice-origin Payments enforce:

- MoneyAccount currency equals invoice currency;
- a base-currency invoice uses exchange rate `1`;
- a conflicting explicit base rate is rejected;
- a foreign-currency Payment uses the invoice exchange rate;
- a conflicting foreign rate is rejected;
- direct Payment endpoints reject POS invoices;
- failed embedded Payment creation rolls back the invoice, journal, stock,
  Payment, ledger, and audit effects.

CustomerReceipt and POS multi-currency behavior are unchanged.

## Frontend implementation

### History source labels

The Sales history contract includes:

```ts
source: 'Invoice' | 'POS Settlement'
```

Active and deleted invoice history dialogs display the source beside each
activity action.

### Z-report query invalidation

The POS feature publicly exports separate TanStack Query prefixes for:

- Z-report lists;
- Z-report details.

Both prefixes are invalidated after:

- POS settlement correction;
- commercial correction of a POS invoice;
- POS invoice deletion;
- refund posting;
- POS void.

Invalidation remains feature-scoped rather than clearing every POS query.

### Embedded Payment account state

The create-invoice form queries MoneyAccounts by selected branch and invoice
currency. A selected embedded Payment account remains valid only when it is:

- active;
- in the selected branch;
- in the invoice currency;
- available to the current user with `Operate` access.

Invalid selected IDs are cleared with dirty and validation flags only after a
successful, non-fetching scoped query. They are not cleared during initial load,
refetch, or existing-invoice display.

### POS correction form

The settlement correction form now uses React Hook Form's `useWatch` for payment
mode, avoiding the React compiler warning produced by calling `form.watch`
directly during render.

## Errors added

```text
POS_REAL_CUSTOMER_REQUIRED
SALES_POS_INVOICE_DATE_IMMUTABLE
```

Existing typed errors remain authoritative for settlement concurrency, immutable
POS branch/currency behavior, Payment account-currency mismatch, Payment
exchange-rate mismatch, and source-invoice mismatch.

## Schema migration

The model change requires:

```text
20261001082333_PreservePosCheckoutPaymentMode
```

It adds required `pos_contexts.PaymentMode` with a maximum length of 16. The
migration contains no default, backfill, or compatibility conversion. This is
intentional: the Unified Payment Engine is a fresh-database cutover, and the
column must not manufacture historical checkout modes for populated data.

The complete EF model snapshot was updated. EF reports no pending model changes,
and the full idempotent migration SQL chain can be generated successfully.

## Main implementation locations

| Concern | Location |
| --- | --- |
| Checkout and settlement orchestration | `Api/Modules/Pos/PosService.cs` |
| Central settlement validation | `Api/Modules/Pos/PosSettlementService.cs` |
| PosContext persistence | `Api/Modules/Pos/Entities/PosEntity.cs` |
| PosContext EF mapping | `Api/Modules/Pos/Entities/PosEntityConfiguration.cs` |
| Commercial invoice correction and history | `Api/Modules/Sales/SalesInvoiceCorrectionService.cs` |
| Customer statement SQL projection | `Api/Modules/Finance/CustomerAccountReader.cs` |
| Centralized error codes | `Api/Infrastructure/Http/ErrorCodes.cs` |
| POS query invalidation | `client/src/features/pos/hooks/usePos.ts` |
| Sales/POS correction invalidation | `client/src/features/sales/hooks/useSales.ts` |
| Embedded Payment account handling | `client/src/features/sales/pages/CreateSalesInvoicePage.tsx` |
| Active/deleted history presentation | `client/src/features/sales/pages/CreateSalesInvoicePage.tsx`, `DeletedSalesInvoicesPage.tsx` |
| Backend hardening coverage | `Api.Tests/PosSettlementHardeningTests.cs` |

## Verification performed

The final implementation was checked with:

```text
dotnet build Api/api.csproj --no-restore
dotnet test Api.Tests/Api.Tests.csproj --no-restore
pnpm --dir client test --run
pnpm --dir client lint
pnpm --dir client build
dotnet ef migrations has-pending-model-changes --project Api/api.csproj
dotnet ef migrations script --idempotent --project Api/api.csproj
graphify update .
```

Results:

- backend: 224 tests passed;
- frontend: 155 tests passed;
- frontend lint passed without warnings;
- API and production client builds passed;
- EF reported no pending model changes;
- the complete idempotent migration script was generated;
- the non-historical source scan found no independent `PosSaleId`,
  `SourcePosSaleId`, `PosSaleEntity`, or `DbSet<PosSaleEntity>` identity.

The retained `InventoryDocumentType.PosSale` label is intentional: inventory may
keep the POS business type, while its source ID and document number are the
SalesInvoice identity. Public UI wording such as “POS Sale” and response/query
type names may also remain without representing a persisted identity.

The .NET commands reported a NuGet vulnerability-metadata warning because the
NuGet service index was unavailable; compilation and tests still succeeded. The
client build reported Vite's existing large-chunk advisory.

## PostgreSQL deployment note

No configured development database was reset or modified. During local
verification, Docker's daemon was not running and no PostgreSQL server responded
on `localhost:5432`, so the migration and seed chain was not applied to a live
throwaway PostgreSQL instance.

Before release, use a separate empty PostgreSQL database with a direct,
non-pooled connection and run:

```text
dotnet ef database update --project Api/api.csproj
```

Then start the application so normal seeders provision the SuperAdmin and
protected branch Walk-in Customers. Smoke-test paid Walk-in checkout,
Partial/Credit real-customer checkout, settlement correction, commercial invoice
correction, refund/void, Z-report replacement, direct/embedded Payments, and
customer-account paging. Do not perform this validation against the configured
development database unless that database is explicitly selected for reset.

## Maintenance rules

Future changes must preserve these rules:

1. Never infer historical checkout mode from the current invoice total.
2. Commercial invoice correction must not write settlement or drawer state.
3. Settlement correction is the only correction path that changes
   `PosContext.PaymentMode`.
4. SalesInvoice Payment status remains derived; do not store a competing status.
5. Partial/Credit validation stays in the shared POS settlement service.
6. Closed-session Z reports remain replaceable derived snapshots with stable
   identity and closure metadata.
7. Direct Payment writes remain invoice-scoped and unavailable for POS invoices.
8. Customer balances and statements remain SQL-backed read models, not stored
   balances.
9. Keep tender/change as X/Z truth and Payment as collection-accounting truth.
10. Do not add fallback, backfill, deprecated, or dual-read settlement paths.
