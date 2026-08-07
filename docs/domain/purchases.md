# Purchases Domain

**Status:** Accepted MVP contract.

Purchases owns `PurchaseInvoices` and `PurchaseInvoiceLines`. One invoice shape represents a purchase or purchase return. A return has `IsReturn = true`, links to the posted original invoice, and each return line links to its original line. It never edits the original.

Draft invoices are editable/deletable and create no ledger rows. Posting atomically marks the invoice Posted, adds payable/purchase-or-expense movements to `AccountTransactions`, and adds positive product movements to `StockTransactions`. Purchase returns use the opposite signs. Voiding appends exact reversals and marks the source Voided.

Purchases validates that the contact is an active Vendor (or CustomerAndVendor), plus base currency, exact line/header totals, inventory eligibility, allowed lifecycle transition, source idempotency, and cumulative returnable quantity. Return lines must exactly inherit the original item, account, UoM, conversion, and unit-price snapshot. `WarehouseId` is optional for non-stock purchases and required for tracked inventory. An invoice with an active payment allocation cannot be voided, and an original invoice cannot be voided while any linked return remains Posted. Invoice outstanding equals total less active payment allocations and linked posted returns; it is not the vendor's general ledger balance.

See [database.md](../architecture/database.md) for the relational design, explicit opening-balance ledger workflow, and indexes.
