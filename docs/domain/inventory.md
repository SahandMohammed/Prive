# Inventory Domain

**Status:** Baseline only; validate and extend from the original inventory specification.

Inventory owns stock quantities, stock movements, valuation policy, and the rules for availability. Sales, purchases, and warehouse workflows request documented inventory effects; they do not independently recalculate stock.

Before building a stock-affecting flow, document item eligibility, movement type, effective timestamp, source document, reversal strategy, concurrency/negative-stock policy, and warehouse/location ownership.
