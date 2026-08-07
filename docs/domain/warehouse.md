# Warehouse Domain

**Status:** Accepted MVP contract.

Warehouse owns `WarehouseTransfers`, their lines, and warehouse master data. A transfer has distinct source and destination warehouses and positive line quantities expressed in a snapshotted UoM conversion.

Draft transfers are editable/deletable and have no stock effect. Posting creates one negative source and one positive destination `StockTransaction` per line in a single transaction, then makes the document immutable. Voiding appends exact opposite movements and marks the transfer Voided.

Partial fulfillment, receiving documents, dispatch documents, multi-branch custody, bins, batches, and serial tracking are out of scope. See [database.md](../architecture/database.md) for the relational contract.
