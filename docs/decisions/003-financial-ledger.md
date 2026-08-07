# ADR-003 — Signed Operational Financial Ledger

**Status:** Accepted
**Date:** 2026-08-07

## Context

Privé needs operational account, customer, and vendor balances for its MVP. Earlier code implemented a double-entry journal and created a separate account for every contact. That model conflicts with the product scope and creates two competing financial sources of truth.

## Decision

Use one append-only `AccountTransactions` ledger with signed amounts:

- positive `BaseAmount` increases the selected account balance;
- negative `BaseAmount` decreases it;
- an account balance is `SUM(BaseAmount)` by `AccountId`;
- a customer/vendor balance is the same sum filtered by the shared receivable/payable account and `ContactId`;
- opening balances, invoices, returns, vouchers, manual adjustments, and reversals all post to this ledger;
- posted transactions are never edited or deleted;
- corrections append exact opposite transactions linked through `ReversesTransactionId`.

Sales and purchases own separate source-document tables. Finance owns `FinancialVouchers`, `PaymentAllocations`, and `AccountTransactions`. Allocations describe invoice settlement only and never create additional ledger movements.

The MVP supports only base-currency workflows. Currency references remain on documents, vouchers, and transactions so the currency-equality rule is explicit, but there are no FX gains/losses, revaluation, or cross-currency allocations/transfers.

## Consequences

- `JournalEntries` and `JournalEntryLines` are removed.
- `Contacts.AccountId`, `Contacts.OpeningBalance`, and mutable balance columns are removed.
- shared accounts such as Customer Receivables and Vendor Payables replace per-contact accounts.
- general balances and invoice outstanding balances are intentionally separate calculations.
- statutory double-entry reporting, fiscal close, reconciliation, and tax accounting are outside this architecture.

See [database.md](../architecture/database.md) and [finance.md](../domain/finance.md) for the full persistence and posting contract.
