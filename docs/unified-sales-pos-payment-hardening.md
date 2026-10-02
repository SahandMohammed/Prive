# Unified Sales, POS, and Payment Contract

This document describes the active sessionless POS architecture. The superseded
operational design is retained separately as historical documentation.

## Ownership

```text
SalesInvoice
├── SalesInvoiceLine                 commercial and professional-work truth
├── PosContext?                      POS origin and retry metadata only
└── PaymentAllocation[]
    └── Payment                      settlement truth
        ├── PaymentMoneyLine[]       collection/change money movement
        ├── MoneyLedger[]            Money Account effects
        └── Journal                  accounting effects

PosRefund
├── immutable refund-line snapshots
├── refund payout records
└── MoneyLedger and Journal effects
```

- Professional work comes from `SalesInvoice` and `SalesInvoiceLine`.
- Money received or returned at checkout comes from `Payment` and
  `PaymentMoneyLine`.
- Money Account balances come from `MoneyLedger`.
- Refund activity comes from `PosRefund`, its immutable refund lines, and
  `MoneyLedger`.
- POS origin is the presence of `PosContext`.

Every invoice uses the ordinary Sales invoice number sequence. A POS invoice has
no separate sale identity.

`PosContext` contains only the invoice ID, operator ID, completion timestamp,
client request ID, and request fingerprint. It has no payment, payment-mode, or
session relationship.

## Checkout settlement

Checkout accepts `Paid`, `Partial`, and `Credit` as request intent; the mode is
not persisted. Current status is always derived from active allocations:

- zero collected: Unpaid/Credit;
- collected below the effective invoice total: Partial;
- collected equal to the effective invoice total: Paid;
- collected above the effective invoice total: Overpaid.

A Credit checkout creates no Payment and no collection/change
`PaymentMoneyLine` records. Partial checkout requires a registered customer,
positive net collection below the invoice total, one or more Collection lines,
and no Change line. Paid checkout requires net collection equal to the invoice
total. Gross collection above the invoice total must be offset exactly by one
eligible Change line in a base-currency Cashbox assigned to the same branch and
operable by the current user. Walk-in checkout must be fully paid.

An invoice has at most one active POS-origin Payment, enforced by a filtered
unique index on `Payment.SourceSalesInvoiceId` for active POS Payments.

## Corrections and deletion

Commercial invoice correction rebuilds only invoice-owned commercial,
inventory, and accounting effects. It does not reconstruct or mutate the POS
Payment. For example:

```text
Invoice       30,000
Collected     25,000
Outstanding    5,000
Status        Partial
```

Reducing the invoice below the unchanged collection derives Overpaid. For the
protected Walk-in customer, a POS-origin correction is rejected if it would
create an outstanding balance.

A posted refund is an immutable dependency on its original
`SalesInvoiceLine`. Because correction requests do not carry stable line IDs,
any posted refund blocks commercial correction or deletion of the source
invoice through the existing typed dependency error.

Invoice deletion blocks independent allocations, reversals, posted refunds, and
other non-owned dependants. When the only financial effects belong exclusively
to the invoice's active POS Payment, deletion invokes the unified
`PaymentService` deletion lifecycle. There is no POS-specific payment reversal
or deletion implementation.

## Professional Performance

Professional Performance is the only POS-adjacent aggregate report in this
change. Sales activity uses posted service lines, persisted base line amounts,
and distinct invoice visits. Refund activity uses the refund posting period,
the original invoice's branch and POS/manual source, and immutable refund-line
professional/service/base-value snapshots. Native amounts from different
currencies are never aggregated.
