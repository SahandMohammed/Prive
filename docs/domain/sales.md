# Sales Domain

**Status:** Baseline only; validate and extend from the original sales specification.

Sales owns customer-facing sales documents, their lines, lifecycle, and sales-specific validation. Any inventory reservation/deduction and finance posting must be explicitly defined here and coordinated with the Inventory and Finance owners; sales must not update account balances by an undocumented shortcut.

For each supported transition, document the trigger, allowed prior state, inventory effect, finance effect, reversal/cancellation effect, permissions, and audit requirement.
