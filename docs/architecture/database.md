# Final MVP Database Architecture

**Authority:** final relational design for the operational MVP.
**Decision source:** ADR-003 and the approved final MVP architecture review.

## Model

Sales and purchases use separate source documents. Financial and inventory effects use one universal ledger each.

```text
SalesInvoices ─┬─ SalesInvoiceLines ─┬─> AccountTransactions
               │                     └─> StockTransactions
               └─> PaymentAllocations

PurchaseInvoices ─┬─ PurchaseInvoiceLines ─┬─> AccountTransactions
                  │                        └─> StockTransactions
                  └─> PaymentAllocations

FinancialVouchers ─┬─> AccountTransactions
                   └─> PaymentAllocations

WarehouseTransfers ─┐
StockAdjustments ────┴─> StockTransactions
```

`AccountTransactions` and `StockTransactions` are authoritative, append-only ledgers. Source documents own intent and workflow; ledger rows own posted balance effects.

## Tables and essential columns

### Master data

- `Accounts`: `Id`, unique `Code`, `Name`, `Category`, operational `Type`, optional hierarchy/currency, activity metadata. It has no balance column.
- `Contacts`: `Id`, `Name`, `Type`, contact details, activity metadata. It has neither `AccountId` nor `OpeningBalance`.
- `BusinessSettings`: a database-enforced singleton row whose required `BaseCurrencyId`, `DefaultReceivableAccountId`, and `DefaultPayableAccountId` select the only MVP currency and shared contact control accounts. Posting never discovers these accounts by type.
- `Items`: unique `Code`, `Type`, `TrackInventory`, base UoM, default `SalesAccountId` and `PurchaseAccountId`, pricing and catalog metadata. Account IDs remain nullable for legacy catalog migration; posting requires the relevant account.
- `ItemUnitsOfMeasure`: item/UoM pair, conversion factor, selling/purchasing default flags.
- `Warehouses`, `ItemCategories`, `UnitsOfMeasure`, and the existing simple `Currencies` remain master data.

### Sales and purchases

`SalesInvoices` contains `InvoiceNumber`, `CustomerId`, optional `WarehouseId`, `CurrencyId`, `IsReturn`, optional `OriginalSalesInvoiceId`, dates, `Status`, totals, notes, and posting/void timestamps. `SalesInvoiceLines` snapshots the item, description, UoM, conversion factor, quantity, prices/discount/total, actual `SalesAccountId`, and optional `OriginalSalesInvoiceLineId`.

`PurchaseInvoices` has the same lifecycle shape with `VendorId`, optional `WarehouseId`, optional vendor reference, `OriginalPurchaseInvoiceId`, and matching purchase-line fields including the snapshotted `PurchaseAccountId` and `OriginalPurchaseInvoiceLineId`.

All normal and return quantities/amounts on source documents are positive. `IsReturn` determines posting sign. A return is a new document and never modifies its original.

### Finance

`AccountTransactions` contains `AccountId`, optional `ContactId`, `CurrencyId`, signed `Amount`, signed `BaseAmount`, transaction date, typed `SourceType`, `SourceId`, description, optional `ReversesTransactionId`, and creation time. MVP base-currency rows require `Amount = BaseAmount`.

`FinancialVouchers` supports only Receipt, Payment, and Transfer. It contains one cash/bank-or-source `AccountId`, one offset-or-destination `CounterpartyAccountId`, optional `ContactId`, `CurrencyId`, positive `Amount`, lifecycle fields, and descriptive references.

`PaymentAllocations` contains `FinancialVoucherId`, exactly one of `SalesInvoiceId` or `PurchaseInvoiceId`, positive `AllocatedAmount`, `IsActive`, and creation time. It changes settlement metadata only.

### Inventory

`StockTransactions` contains `WarehouseId`, `ItemId`, signed `QuantityBase`, transaction date, typed `SourceType`, `SourceId`, notes, optional `ReversesTransactionId`, and creation time.

`WarehouseTransfers`/`WarehouseTransferLines` store source, destination, item, UoM, positive quantity, conversion snapshot, and lifecycle metadata. `StockAdjustments`/`StockAdjustmentLines` store warehouse, a constrained MVP reason, signed quantity, UoM/conversion snapshot, and lifecycle metadata.

## Structural changes

| Change | Replaces | Why | Existing-data treatment | Database constraint/index | Application invariant |
| --- | --- | --- | --- | --- | --- |
| Separate sales and purchase invoice tables | `OperationalDocuments`, `OperationalDocumentLines`, legacy `Invoices`, `InvoiceLines` | The domains evolve independently while retaining explicit contracts | Experimental schema is replaced by one clean initial migration | Unique document numbers; customer/vendor date indexes; restricted FKs | Contact role, base currency, totals, state transitions, and atomic posting |
| Model returns in their owning invoice table | Separate return tables or generic document types | Returns preserve the posted original and support quantity validation | No separate return data exists in the accepted lineage | Header return-link check and self-FK; line self-FK/index | Original must be posted, same contact/currency/item, and cumulative returned quantity cannot exceed sold/purchased quantity |
| One signed financial ledger | `JournalEntries`, `JournalEntryLines`, any specialized transaction tables | One operational source of truth without a statutory double-entry engine | Experimental tables are removed in the clean schema | Account/date, contact/date, contact/account/date, and source indexes; nonzero amounts | Insert-only after posting, account eligibility, correct signs, idempotent atomic posting |
| Shared receivable/payable accounts plus ledger `ContactId` | `Contacts.AccountId` and per-contact subaccounts | Contact balances are dimensions of shared control accounts | Obsolete contact finance columns are absent from the clean schema | `ContactId` FK and contact/account/date index | Use explicitly configured Receivable and Payable accounts; never create a contact account |
| Ledger-based opening balances | `Contacts.OpeningBalance` | Prevents a second balance source | Opening balances start as explicit ledger movements | Normal ledger constraints | Opening posting is immutable and must not be duplicated |
| Financial vouchers with two explicit accounts | Legacy `Vouchers` | Supports receipt, payment, direct expense, and same-currency transfer without journals | Nonempty legacy vouchers block automatic migration | Positive amount; different accounts; transfer cannot have contact; number/type/date indexes | Account roles, contact requirements, same currency, lifecycle and atomic movements |
| Allocation targets exactly one invoice domain | `VoucherAllocations` and generic document allocation | Settlement is separate from money movement | Clean schema | Positive amount; XOR invoice FK; active-only partial unique voucher/invoice indexes | Voucher must be active Posted and non-Transfer; contact/currency match; totals are checked under serializable row locks; edits do not post money |
| One signed stock ledger | Any module-specific/current-stock storage | Stock is the sum of immutable movements | No prior authoritative stock ledger is present | Warehouse/item/date and source indexes; nonzero quantity | Inventory-tracked products only, conversion correctness, atomic posting, and no negative stock |
| Transfer and adjustment source documents | Ad-hoc stock edits | Auditable inventory changes with Draft/Posted/Voided lifecycle | New tables | Different warehouses; positive transfer quantities; nonzero adjustment quantities; unique numbers | Two transfer movements per line in one DB transaction; valid reason and exact reversal on void |
| Item account defaults and historical line snapshots | Runtime lookup of mutable item defaults | Historical documents must retain the posting account used | Existing item account IDs remain nullable until catalog cleanup | Restricted FKs | Relevant account required before posting; later item edits never change posted lines |
| UoM and item uniqueness | Unconstrained duplicate mappings/default flags | Prevents ambiguous conversion and defaults | Migration aborts on duplicates/multiple defaults | Unique item code; unique item/UoM; partial unique selling and purchasing defaults | Selected UoM must belong to item; conversion snapshot must match mapping at draft/post time |
| Exact reversal links | Unconstrained multiple reversals | Preserves immutable audit history | New ledgers | Partial unique index on each `ReversesTransactionId` | Reversal must copy all dimensions and negate original amount/quantity exactly; one active reversal only |
| One shared lifecycle | Editable posted records | Posted effects must be immutable and auditable | New source tables | Status stored as Draft/Posted/Voided | Draft only is editable/deletable; posting is atomic; void appends reversals and never deletes ledger rows |

## Posting and balance rules

- Sale: receivable `+Total`, income `+line amounts`, inventory products `-QuantityBase`.
- Sales return: receivable and income are negative; returned inventory is positive.
- Purchase: payable `+Total`, purchase/expense `+line amounts`, inventory products `+QuantityBase`.
- Purchase return: payable and purchase/expense are negative; returned inventory is negative.
- Receipt/payment/transfer signs follow ADR-003 and are created once per voucher. Allocations never duplicate them.
- Account balance is `SUM(AccountTransactions.BaseAmount)`.
- Stock is `SUM(StockTransactions.QuantityBase)` by warehouse and item.
- Invoice outstanding is invoice total minus active allocations and linked posted returns. It is not a contact balance.

Posting the financial and stock effects of a source document happens in one serializable database transaction. A conditional `Draft -> Posted` update claims the document; concurrent aggregate checks for stock, returns, and allocations are protected by the same isolation level. A retry or losing request fails with a conflict and cannot append duplicate or partial movements.

Allocation creation additionally locks its voucher row and target invoice row before checking voucher capacity and invoice outstanding. This serializes allocations that compete for the same voucher or invoice. Sales, Purchases, Receipts, and contact-backed Payments require an active contact with the correct Customer/Vendor role.

Invoices and vouchers must use `BusinessSettings.BaseCurrencyId`; the configured base currency must be active with an exchange rate of `1`. A warehouse is required only when an invoice has at least one inventory-tracked line. Stock-decreasing posts are rejected unless the ledger sum covers the requested quantity.

## Migration policy

Migration `20260807225956_InitialMvpArchitecture` is the single clean initial migration for this experimental environment. It creates the final schema directly; the superseded experimental migrations and legacy invoice, voucher, journal, universal-document, per-contact account, and stored opening-balance structures are not retained. Its executable SQL contains no duplicate primary-key index statements.

Existing databases created from the removed migration lineage must be dropped and recreated before applying this migration. This is intentional because there is no important data to preserve.

## Application-only invariants

Relational constraints cannot compare aggregate history or polymorphic ledger sources. Services enforce returnable quantity, invoice outstanding, total active allocations, contact/type/currency matches, source idempotency, posted immutability, exact reversal values, inventory eligibility, nonnegative stock, document total arithmetic, valid lifecycle transitions, and atomic cross-ledger posting. Voucher voiding deactivates active allocations atomically. Invoice voiding is rejected until active allocations and any Posted returns have been reversed.
