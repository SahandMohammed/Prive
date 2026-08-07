---
name: extend-prive-module
description: Safely extend an existing Prive backend module and matching React feature without breaking established contracts. Use when a user asks to add a field, workflow, endpoint, screen, status, or capability to an existing Prive module.
---

# Extend a Prive Module

1. Read `AGENTS.md` and the routed architecture/domain/decision documents. Inspect the entire relevant module or feature, its tests, routes, contracts, and nearest analogous workflow before changing it.
2. State the existing behaviour being preserved, the requested delta, affected API/database/UI contracts, and whether data migration/backfill is required. Escalate conflicts between code and current documentation instead of guessing.
3. Preserve module ownership and public contracts. Extend existing DTO/API/query-key/form patterns rather than creating parallel paths. Keep compatibility deliberately; identify any breaking API or persisted-data change before making it.
4. Put business rules and expected exceptions in the service. Add or update centralized error codes. Keep controllers, pure feature API calls, Query hooks, and UI error states aligned with the standard envelope.
5. Add a migration for schema changes and safe handling for existing records when applicable. Update the routed domain document or ADR only when the enduring contract changes.
6. Run focused tests plus affected build/typecheck/lint commands. Validate old and new paths, authorization, validation failures, and cache invalidation.

Report compatibility decisions, migration implications, verification, and follow-up work that was intentionally deferred.
