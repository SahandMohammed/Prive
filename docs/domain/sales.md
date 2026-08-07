# Sales Domain

**Status:** Accepted MVP contract.

Sales owns `SalesInvoices` and `SalesInvoiceLines`. One invoice shape represents a sale or sales return. A return has `IsReturn = true`, links to the posted original invoice, and each return line links to its original line. It never edits the original.

Draft invoices are editable/deletable and create no ledger rows. Posting atomically marks the invoice Posted, adds receivable/income movements to `AccountTransactions`, and adds negative product movements to `StockTransactions`; services never affect stock. Returns use the opposite signs. Voiding appends exact reversals and marks the source Voided.

Sales validates that the contact is an active Customer (or CustomerAndVendor), plus base currency, exact line/header totals, inventory eligibility, allowed lifecycle transition, source idempotency, and cumulative returnable quantity. Return lines must exactly inherit the original item, account, UoM, conversion, and unit-price snapshot. `WarehouseId` is optional for service-only invoices and required for tracked inventory. An invoice with an active receipt allocation cannot be voided, and an original invoice cannot be voided while any linked return remains Posted. Invoice outstanding equals total less active receipt allocations and linked posted returns; it is not the customer's general ledger balance.

See [database.md](../architecture/database.md) for the relational design and indexes.
