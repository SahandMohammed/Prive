# Finance Domain

**Status:** Accepted MVP contract.
**Authority:** ADR-003 and the final MVP database architecture.

Finance owns Accounts, Currencies, Financial Vouchers, Payment Allocations, and the immutable `AccountTransactions` ledger. Sales and Purchases own their invoices and request finance posting in the same database transaction used to mark a document Posted.

Balances are always derived from signed `BaseAmount`. Accounts have no mutable balance. Contacts use the shared Customer Receivables or Vendor Payables account and are identified on ledger rows by `ContactId`. Opening balances are ledger movements. Because the MVP is base-currency only, every ledger movement requires `Amount = BaseAmount`.

Financial vouchers support Receipt, Payment, and same-currency Transfer. A posted voucher creates its account movements once. Allocation rows only describe which normal sales or purchase invoices a receipt/payment settles; returns cannot be allocation targets and allocations do not create movements. The voucher must be active, Posted, and non-Transfer. Allocation services lock the voucher and target invoice inside a serializable transaction before enforcing positive amounts, voucher capacity, invoice outstanding, matching contact and currency, and the allowed voucher/invoice pairing. Voiding a voucher reverses its ledger movements and deactivates its allocations atomically.

Draft documents create no movements. Posted documents and ledger rows are immutable. Voiding appends exact opposite transactions linked through `ReversesTransactionId`. Posting and reversal operations must be idempotent and atomic.

Statutory double-entry journals, reconciliation, period close, FX accounting, and tax accounting are out of scope. See [database.md](../architecture/database.md) for tables, constraints, migration policy, and posting signs.
