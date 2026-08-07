# Purchases Domain

**Status:** Baseline only; validate and extend from the original purchase specification.

Purchases owns supplier-facing purchase documents, their lines, lifecycle, and purchase-specific validation. Document exactly when receipt/approval/posting happens and whether each transition affects stock, supplier obligations, or finance. Finance owns payments and ledger entries according to ADR-003; purchases supplies the source event and required references.

For returns and cancellations, define the inventory reversal, supplier obligation reversal, permission, and immutable audit trail before implementation.
