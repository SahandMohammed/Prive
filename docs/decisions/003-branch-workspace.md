# ADR-003 — Branch workspaces and catalog sharing

**Status:** Accepted for the global branch selector implementation.

## Decision

One active branch is selected per signed-in browser session. The sidebar lists only active branches the current user can access. SuperAdmins and Owners can access all active branches. Other users require a `user_branch_access` assignment; the migration assigns existing Managers, Professionals, and Cashiers to the main branch. User mutations, branch access management, and branch create/update/deactivate operations require an Owner or SuperAdmin, preventing staff from granting themselves access or changing the branch structure. Managers may still read branch setup information required by the administration UI.

Operational requests carry `X-Branch-Id`. `BranchScopeFilter` verifies the active user, branch status, and current assignments against the database on every request. A DTO's `BranchId`, when provided, must match the header. Missing selection returns `BRANCH_SELECTION_REQUIRED`; inaccessible selection returns `BRANCH_ACCESS_DENIED`; mismatched rows or references return `BRANCH_SCOPE_MISMATCH`.

`AppDbContext` filters branch-owned roots and dependent rows, including inventory and money movements, invoice lines, receipts, allocations, POS records, and journal lines. Persistence checks reject writes and references outside the current branch/catalog. Database queries, rather than the tracking cache, validate updates and deletes. Startup seeding and migration tooling run without a selected branch. Auth, user administration, branch administration, business setup, and currencies explicitly opt out of the operational request filter so setup remains possible before the first branch exists.

The client remembers only a selected branch ID per user in session storage. TanStack Query owns branch records. A switch cancels and removes workspace queries and remounts forms. Switching is disabled while a mutation is pending. Each request snapshots its header so retries retain the original branch. Revoked access triggers a refresh of the accessible branch list.

## Catalog choice at branch creation

- **Shared** (default): branches use one business catalog of customers/suppliers, products, services, categories, units, and conversions. Saving a definition updates this shared catalog.
- **Separate**: the branch starts with an empty private catalog of those definitions. Catalog records are created in its own scope and cannot reference a different catalog.

`CatalogBranchId = null` identifies shared definitions; a branch ID identifies private definitions. Scoped unique indexes allow private branches to reuse item codes and category names. Existing definitions remain shared, without copying or reassignment. `CatalogMode` is fixed at creation and is not part of the branch update contract; changing it later would need a separate migration workflow to preserve historical references.

The chart of accounts, currencies, exchange rates, business settings, and expense categories remain business-wide. Transactions and balances always follow the selected branch, including for shared contacts and items. History checks protecting shared definitions inspect all branches. Document numbering also remains global to preserve existing unique document numbers. Money Account and Warehouse codes also remain globally unique business identifiers even though their rows are branch-scoped. New transfers must reference warehouses/accounts in the selected branch.

## Research and rationale

[Odoo's multi-company documentation](https://www.odoo.com/documentation/17.0/applications/general/companies/multi_company.html) distinguishes shareable products/contacts from entity-specific records, and [its company documentation](https://www.odoo.com/documentation/17.0/applications/general/companies.html) describes shared products and contacts across a parent company and branches. These support separating catalog ownership from operational branch ownership.

For Prive, the creation-time choice and shared chart of accounts are product requirements. Defaulting to shared definitions preserves existing data and avoids duplicate salon catalogs; separate catalogs support branches with independent customer lists or offerings. Starting separate catalogs empty makes ownership explicit and avoids silent copying of customer data.

## Verification and deployment

Apply `AddBranchAccessAndCatalogScope` before serving the updated client. Normal API startup applies pending migrations through the existing seeder. The migration adds assignments, catalog ownership, sharing mode, indexes, and foreign keys. It does not move transaction data or duplicate existing catalog data. Back up production before normal migration deployment; rollback after private catalogs acquire overlapping codes requires reconciling those codes before the former global unique indexes can be restored.
