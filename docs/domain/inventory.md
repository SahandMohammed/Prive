# Inventory Domain

**Status:** Accepted MVP contract.

Inventory owns the immutable signed `StockTransactions` ledger. Stock on hand is `SUM(QuantityBase)` filtered by warehouse and item; Items do not store authoritative current stock.

Purchase and sales source documents, Warehouse Transfers, and Stock Adjustments request inventory movements. Products with `TrackInventory = true` may post; services never post stock. Purchases and sales returns use opposite signs from their originals. A transfer posts a negative source and positive destination movement for every line atomically. An adjustment posts its signed line quantity.

Posted stock movements are never edited or deleted. Voiding appends exact opposite movements linked by `ReversesTransactionId`. Negative stock is prohibited: sales, purchase returns, transfer sources, and negative adjustments must have enough stock. Serializable posting transactions make the availability check and ledger insert concurrency-safe. Inventory services also enforce item/UoM conversion, source idempotency, posting atomicity, and lifecycle rules.

Costing, COGS automation, reservations, lots, serials, FIFO, and weighted average are out of scope. See [database.md](../architecture/database.md) for constraints and indexes.
