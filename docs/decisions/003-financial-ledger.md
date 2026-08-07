# ADR-003 — Financial Ledger Model

**Status:** Proposed — owner decision required before finance-affecting work

## Context

The referenced material contains contradictory financial models: a simple operational ledger with immutable movements and a strict double-entry/IFRS system. They are not interchangeable.

## Decision required

Choose one model explicitly before implementing sales, purchases, payments, transfers, account balances, or posting corrections. Record the chosen model, balance derivation, posting ownership, correction strategy, and reporting scope here. Mark the ADR `Accepted` only then.

## Safety rule until accepted

Do not implement a new finance-affecting workflow from archived documentation. Preserve existing behavior and ask for direction where the source does not settle the accounting effect.
