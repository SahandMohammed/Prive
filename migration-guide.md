# Prive Documentation Migration Guide

## Outcome

Place this package at the repository root. It replaces a large, conflicting all-purpose agent prompt with a concise `AGENTS.md` and one authority for each concern. Preserve the original Markdown files during the review; move, split, or archive them only after their content is accounted for.

## Exact placement for sources visible in the referenced conversation

| Original document/title | Destination | Action |
| --- | --- | --- |
| `Prive MVP — AI Context & Architecture Guide` | `AGENTS.md`, `docs/architecture/backend.md`, `docs/architecture/error-handling.md`, `docs/architecture/frontend.md` | Replace it as an instruction file with `AGENTS.md`; move its explanatory material into the named references. Do not keep it as a second source of rules. |
| `Prive — Frontend Architecture Guide` | `docs/architecture/frontend.md` | Merge into this file. Keep implementation facts that match the code; discard contradictory claims. Radix is the canonical shadcn primitive, not Base UI. |
| Exception/error-flow document | `docs/architecture/error-handling.md` | Merge the envelope, error-code, trace-ID, retry, and UI-error rules here. |
| Auth MVP implementation report | `docs/architecture/authentication.md` or `docs/archive/auth-mvp-implementation.md` | Put enduring current contracts in the architecture doc; archive a chronological implementation report. |
| Backend MVP setup implementation report | `docs/archive/backend-mvp-setup.md` | Archive it. Do not retain implementation-order instructions as current rules. Extract only still-current setup facts into `backend.md`. |
| `LogicBloom ERP: Financial Accounting System MVP` | `docs/archive/logicbloom-financial-accounting-mvp.md` | Archive it unless the owner explicitly adopts its double-entry/IFRS model through a new accepted ADR. It must not silently govern Prive. |

The referenced chat says that eight files were attached, but it does not expose the remaining attachment names or contents to Codex. For each remaining file, use the deterministic routing table below; record its original name in the destination file's `Source migration` section before deleting it.

## Routing for the three unavailable attachments

| If the source primarily describes… | Put it in… | Rule |
| --- | --- | --- |
| Current API/backend structure, EF, controllers, or services | `docs/architecture/backend.md` | Keep only present-tense rules that match code. |
| Current client structure, queries, routing, forms, or components | `docs/architecture/frontend.md` | Keep only present-tense rules that match code. |
| Error envelopes, exceptions, validation, or support IDs | `docs/architecture/error-handling.md` | This is the only error-contract reference. |
| Authentication/session/token behaviour | `docs/architecture/authentication.md` and ADR 002 if a choice is being made | Do not duplicate the contract elsewhere. |
| A business process or ownership rule | the matching `docs/domain/*.md` | State observable effects, invariants, owner, and out-of-scope behaviour. |
| Why a long-lived choice was made | a new numbered ADR | Include status, context, decision, consequences, and alternatives. |
| A completed sprint/MVP/setup narrative | `docs/archive/` | Label it historical and non-authoritative. |

## Conflict resolution checklist

1. Compare every claim with the current code before copying it forward.
2. Preserve one current answer for each topic; remove duplicates from the originating file.
3. Convert a disputed decision into an ADR with `Status: Proposed`; do not present it as settled.
4. In particular, resolve the financial model before finance-affecting implementation. The supplied materials describe both a simple operational ledger and a strict double-entry/IFRS design.
5. Verify the API error-envelope shape in the code and update `001-api-envelope.md` and `error-handling.md` together if it changes.
6. Replace the old files with an archive copy or a one-line pointer, never with a second active rulebook.

## Installation

1. Copy the contents of this folder into the root of the Prive repository.
2. Merge, rather than blindly overwrite, any existing `AGENTS.md` or `docs/` files.
3. Keep the four skill folders at `.agents/skills/`. If your Codex installation only discovers user-level skills, copy those folders to its configured skills directory instead; do not keep two independently edited versions.
4. Run the repository's normal build, test, lint, and typecheck commands after the migration.

## Prompt template for a feature

```text
Implement <scope>.

Read AGENTS.md and the documents it routes for this task. Inspect the closest existing module before changing code.

Requirements:
- <observable behaviour>
- <constraints>

Out of scope:
- <items intentionally excluded>

Done when:
- <tests/build/migration/UI outcome>
```
