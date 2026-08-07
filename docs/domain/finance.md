# Finance Domain

**Status:** Baseline only; complete from validated source material after ADR-003 is accepted.

Finance owns accounts, payments, transfers, and the ledger representation chosen in ADR-003. Sales and purchases own their source documents, but they do not independently invent balance mutation logic.

## Required future contract

Before adding a finance workflow, document its owner, trigger, posting point, effects, correction/reversal policy, idempotency behaviour, and reporting meaning. State whether a source document can be edited after posting.

## Current guardrail

Do not infer double-entry, IFRS reporting, or a single-entry ledger from old documents. Use the accepted financial ADR only.
