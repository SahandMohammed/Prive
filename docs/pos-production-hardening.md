# POS production hardening

**Status:** implemented and verified locally on 2026-09-22.

This document records the production-hardening work delivered for the POS. It
also describes the operational requirements for releasing it safely.

## Delivered changes

### Financial access and business-local time

- Dollar-rate mutation is limited to `SuperAdmin`, `Manager`, and `Owner`.
  Cashiers can see the current rate but cannot change it.
- A shared frontend capability map now governs POS navigation, routes, traceability
  links, receipt actions, exchange-rate editing, and POS-session management. It
  mirrors the existing backend role boundaries; it does not grant new Sales,
  Inventory, Accounting, or Finance access.
- Business settings now include `timeZoneId`, `receiptFooter`, and
  `receiptPaperWidth`. Existing businesses are migrated with
  `Asia/Baghdad` and `80mm` defaults.
- Timestamps remain stored as UTC. POS document dates and implicit/local-date
  filters convert through the configured business IANA timezone, including POS
  sessions, sales, Z reports, dashboard ranges, and the exchange-rate date label.
- POS setup only returns active professionals assigned to the selected branch, and
  checkout applies the same validation.
- A customer may complete a Credit sale without an operable Money Account. Paid
  and Partial payment modes still require an account that can accept the payment.

### Session, currency, and retry invariants

- Opening counts are now the immutable list of Cashbox currencies permitted for a
  session. Opening requires an effective rate and a count (zero is valid) for each
  operable Cashbox currency.
- A cash tender, change, refund, or drawer movement in a Cashbox currency added
  after opening is rejected until the session is closed and reopened. Bank-account
  currencies remain dynamic.
- Transactions retain the effective exchange rate at posting time; rates are not
  frozen for an entire session.
- Drawer reconciliation uses:

  ```text
  expected = opening + cash tenders - change - cash refunds
             + cash in - cash out - cash drops +/- adjustments
  variance = counted - expected
  variance base = native variance x closing exchange rate
  ```

  Historical expected base value is kept separate from the physical variance.
  An exchange-rate change therefore does not become a cash shortage/overage and
  does not create automatic FX journals.
- Sale completion, refunds, and voids require `clientRequestId` at the public API.
  Each operation stores a SHA-256 fingerprint of its financially material payload.
  Replaying the same request returns the original result; a different payload for
  the same ID returns `409 POS_IDEMPOTENCY_KEY_REUSED`.

### Drawer movements and reporting

- Added immutable `PosDrawerMovement` records for `CashIn`, `CashOut`,
  `CashDrop`, and `Adjustment`.
- Each movement records its session, Cashbox account, currency, amount, posting
  rate/base amount, rationale, author, time, and related journal/ledger entries.
  Corrections are posted as new adjustments rather than edits or deletes.
- `CashIn`, `CashOut`, and `Adjustment` post against an active GL offset account.
  Adjustments explicitly declare an `In` or `Out` direction. A `CashDrop` transfers
  to another operable Money Account in the same currency and records both ledger
  sides.
- Posting movements and management operations are limited to
  `SuperAdmin`, `Manager`, and `Owner`; session reports remain visible to cashiers
  within their normal POS access.
- Added the following endpoints:

  ```text
  GET  /pos/sessions/{sessionId}/drawer-movements
  POST /pos/sessions/{sessionId}/drawer-movements
  ```

- X reports and immutable Z-report snapshots now include movement totals by type
  and currency, along with explicitly named closing-rate and base-valuation data.
- Managers can force-close accessible sessions from the UI only after reviewing a
  live X report, entering physical closing counts, and supplying closing notes.

### Management and receipt UI

- The POS Transactions tab is backed by the paginated sales endpoint. It supports
  search, customer, branch, session, business-local date range, payment mode, and
  refund-state filters.
- Transaction rows show receipt, customer, cashier, session, gross, settled,
  outstanding, refunded, net, payment mode, refund state, and base currency.
  Receipt view/print is available to POS roles; refund/void controls use the
  management capability.
- Settlement presentation is derived consistently for POS list/detail and Finance
  receivable data, including customer receipts and refunds.
- Receipts use the configured Business and Branch name, contact information,
  address, logo, optional footer, and either 58 mm or 80 mm layout.

## Public contract changes

| Area | Change |
| --- | --- |
| Business | `timeZoneId`, `receiptFooter`, and `receiptPaperWidth` are included in requests and responses. |
| Sale, refund, void | `clientRequestId: Guid` is required by public endpoints. |
| POS sales list | Supports `sessionId`, `paymentMode`, and `refundState`; returns settlement and session identity fields. |
| Drawer summaries | Return movement totals and explicit closing-rate/base-valuation fields. |
| Drawer movements | New request/response DTOs, type/direction enums, validation errors, entities, indexes, ledgers, and journal source relations. |

Clients and API must be deployed together: current clients generate and send a
unique `clientRequestId` for every sale, refund, and void attempt.

## Database migrations

Apply these migrations in order:

1. `20260922064312_PosProductionHardeningFoundation`
   - Adds business timezone and receipt settings, idempotency fields and filtered
     unique indexes, drawer-movement tables/relationships, and Z-report movement
     snapshot fields.
2. `20260922064423_RepairPosVarianceBaseAmounts`
   - Recalculates historical closing-count and Z-report variance-base amounts from
     the stored native variance and closing exchange rate.

The repair migration changes only the known derived variance-base defect; it does
not rewrite historical source financial documents.

## Release checklist

1. Take a verified production database backup and review the migrations in the
   deployment environment.
2. Apply the two migrations above before exposing the updated API and UI.
3. Deploy API and web client together so all financial mutations include
   `clientRequestId`.
4. Confirm every business has a valid IANA timezone and review its receipt footer
   and paper width.
5. Before opening a session, set effective rates for every operable Cashbox
   currency and provide an opening count for each, including zero values.
6. Run a multi-currency smoke test: cash, bank, and credit sale; rate change;
   drawer movement; customer payment; partial refund; idempotent retry; manager
   close; and ledger/journal/X/Z/receipt reconciliation.

## Verification completed

The implementation was verified with:

```text
dotnet build Api/api.csproj --no-restore
dotnet test Api.Tests/Api.Tests.csproj --no-restore    # 153 passed
pnpm --dir client lint
pnpm --dir client test -- --run                        # 86 passed
pnpm --dir client build
git diff --check
```

The production web build succeeds. Vite reports its existing large-chunk advisory;
it is a performance follow-up, not a build failure.

## Release gate: tax

Tax remains deliberately out of scope. Do not deploy this POS for a business that
requires tax handling until inclusive/exclusive pricing, rates, exemptions,
rounding, invoice presentation, and GL mappings have been explicitly approved and
implemented.
