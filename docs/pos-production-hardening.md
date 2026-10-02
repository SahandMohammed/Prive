# Sessionless POS Production Contract

The active POS is a direct, full-screen workspace at `/pos`. It creates an
ordinary posted `SalesInvoice` and, when money is collected, uses the unified
Payment engine. Checkout has no separate operational lifecycle or reporting
snapshot model.

## Posting invariants

- Every service line requires an active, branch-assigned professional. Product
  lines remain unassigned.
- Walk-in checkout must be fully paid.
- Partial and Credit checkout require an active registered customer.
- Collection and refund payout Money Accounts must be active, belong to the
  invoice branch, and be operable by the current user.
- Credit creates no Payment and no collection/change money lines.
- Change is permitted only for Paid checkout and must be exactly one
  base-currency Cashbox Change money line equal to gross collection above the
  invoice total.
- Sale completion, refund, and void requests carry a client request ID and a
  fingerprint of financially material input for idempotent retry handling.
- Timestamps are stored in UTC and business-date boundaries are resolved with
  the configured IANA business timezone.

## Receipts and traceability

Receipts project settlement data from `Payment` and
`PaymentMoneyLine.Direction`. POS metadata exposes only the operator and
completion information. Complete money-line detail remains available through
the Finance Payment endpoint.

Refund lines retain their original invoice-line ID and immutable professional,
service, quantity, and base-value snapshots. Refund reporting uses the original
invoice branch/source and the refund posting timestamp.

## Reporting

Professional Performance is available at
`GET /api/v1/professionals/performance` and `/professionals/performance` under
the Professional-management capability. It reports service quantity, distinct
invoice visits, authoritative posted service-line base value, refund base value,
and net base value. Date filters are inclusive at the API boundary and converted
to half-open UTC timestamp ranges internally.

No POS Sales Summary or Payment Summary report is introduced by this design.

## Release verification

Apply the complete EF Core migration chain to an empty disposable PostgreSQL
database before deployment. Deploy the API and web client together because the
checkout/refund contracts and removed routes have no compatibility bridge.
