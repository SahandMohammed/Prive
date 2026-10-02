# Unified Payment Engine

The unified Payment engine is the sole settlement implementation for Sales,
Customer Receipts, and POS checkout.

## Model

```text
SalesInvoice
└── PaymentAllocation[]
    └── Payment
        ├── PaymentMoneyLine[]
        │   └── MoneyLedger
        └── Journal
```

- `Payment.Amount` and `Payment.BaseAmount` are the net receivable settlement.
- `PaymentAllocation` distributes that settlement to invoices.
- `PaymentMoneyLine` records physical Money Account movement. Amounts are
  positive; `Direction.Collection` and `Direction.Change` provide the sign.
- `MoneyLedger` is the generated Money Account effect.
- The Payment journal is the generated accounting effect.

For checkout:

```text
Payment.BaseAmount
  = SUM(Collection PaymentMoneyLine.BaseAmount)
  - SUM(Change PaymentMoneyLine.BaseAmount)
  = SUM(active PaymentAllocation.BaseAmount)
```

An IQD 18,000 invoice paid with an IQD 20,000 collection and IQD 2,000 change
therefore has an IQD 18,000 Payment, one Collection line for 20,000, and one
Change line for 2,000.

## Origin shapes

| Origin | Allocations | Money lines | Owner |
| --- | --- | --- | --- |
| SalesInvoice | One source invoice | One Collection line | Invoice Payment API |
| CustomerReceipt | One or more customer invoices | One Collection line | Customer Receipt workflow |
| Pos | One source invoice | One or more Collection lines and optional Change line | POS checkout |

For POS-origin Payments, `SourceSalesInvoiceId` identifies the checkout invoice.
Only one active POS Payment may exist per source invoice. The active Payment is
resolved by `Origin == Pos`, matching `SourceSalesInvoiceId`, and
`IsDeleted == false`.

## Settlement projection

Invoice status and balances are derived from active allocations and posted
refund receivable reductions. They are never inferred from a saved checkout
mode and never reconstructed when the commercial invoice changes.

```text
Collected       = SUM(active PaymentAllocation.Amount)
Effective total = MAX(Invoice.Total - posted refund AR reductions, 0)
Outstanding     = MAX(Effective total - Collected, 0)
Overpaid        = MAX(Collected - Effective total, 0)
```

The same projection is calculated in base currency from authoritative persisted
base amounts.

## Lifecycle

`PaymentService` owns Payment creation, correction, and deletion, including its
allocations, money lines, ledgers, journal, concurrency checks, and audit entry.
Callers must use that lifecycle rather than implementing origin-specific
reversal logic.

Payment deletion is blocked by independent allocations, reversals, posted
refunds, or other dependent transactions. Effects exclusively owned by the
Payment are removed by the unified lifecycle and are not blockers.

`MoneyLedgerSourceType.Payment` keeps numeric value `6`. Removed source-type
values are not renumbered.
