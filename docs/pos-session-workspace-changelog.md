# POS Session Workspace — Change Log

**Branch:** `feature/pos-session-workspace`  
**Base:** `main` at `5fc0272d212c5f0d89d6b369048492822bd9ba1c`  
**Implementation reviewed through:** `37a0ef6583019f8650d6d09c83a02a1592275873`

## Purpose

This branch enhances the existing POS session workflow without introducing a second POS/session implementation.

The work keeps the existing POS entities, services, endpoints, session rules, X/Z reports, checkout flow, refunds, branch workspace, and accounting/inventory behavior. The changes focus on session management UX, register availability, routing/layout behavior, and clearer separation between ERP administration and the live POS workspace.

## Final UX

### POS management

`/pos` is now a normal ERP page rendered inside the existing `AppLayout`.

It uses the normal sidebar, top navigation, branch selector, shared list/table styling, and shared dialogs.

The page is organized into tabs:

- **Sessions**
- **Registers** — management roles only
- **Z Reports**

### Live POS workspace

`/pos/workspace` is the only POS route rendered in the standalone/full-screen POS layout.

The management page remains open in the original ERP tab.

### Creating a session

Flow:

1. Open `/pos`.
2. Click **Create new session**.
3. Complete the existing POS opening form inside a wide ERP modal.
4. Select an available register.
5. Enter opening cash counts and optional notes.
6. Submit **Open Session**.
7. After the backend successfully creates the session, the live POS workspace opens in a new browser tab at `/pos/workspace`.

A blank workspace tab is prepared from the user's submit gesture to avoid popup-blocker issues.

If validation or the API request fails, the prepared tab is closed and the error remains visible in the session dialog.

If the browser blocks the new tab completely, the app falls back to the current tab.

### Continuing an existing session

If the signed-in user already has an open POS session:

- the page shows the active session summary;
- the primary action becomes **Continue session**;
- the user's session row is marked **Open · Yours**;
- opening the workspace launches `/pos/workspace` in a new tab.

## Sessions tab

Sessions now use the same shared list pattern used by Branches, Warehouses, Products, Money Accounts, and other ERP pages:

- `DataTableShell`
- shared `Table` primitives
- `DataTablePagination`

Columns:

- Session
- Register
- Cashier
- Opened
- Closed
- Status
- Sales
- Gross
- Variance
- Actions

The existing backend visibility rules are preserved:

- Cashiers see their own sessions.
- Managers, Owners, and SuperAdmins can monitor sessions for the selected branch.

Session status filtering remains available above the table.

## Registers tab

Register management was separated from Sessions into its own tab.

Registers now use the shared table UI instead of cards.

Columns:

- Code
- Register
- Status
- Availability
- Actions

Availability is shown as:

- **Available**
- **In use**

Register creation was moved from an inline form to a shared dialog pattern consistent with Branches and Warehouses.

The register creation dialog collects:

- Register code
- Register name

Existing backend authorization remains unchanged:

- SuperAdmin
- Owner
- Manager

Cashiers do not receive register-management UI.

## Register availability enhancement

`PosRegisterResponse` now exposes:

```csharp
bool HasOpenSession
```

This is derived from existing POS session records.

No database column was added.

No migration is required.

The existing `PosSessionService` calculates whether an active/open session currently uses each register.

This allows the UI to:

- mark registers as **In use**;
- prevent deactivation while a session is open;
- exclude occupied registers from the session-opening form.

The backend remains authoritative and still enforces register/session conflicts independently.

## Z Reports tab

Z Reports were separated into their own tab.

They now use the shared table presentation instead of cards.

Columns:

- Report
- Register
- Cashier
- Closed
- Sales
- Gross
- Refunds
- Net
- Variance
- Actions

The existing route remains:

```text
/pos/z-reports/:id
```

No duplicate reporting implementation was introduced.

## Layout and routing changes

### `/pos`

Now renders the session-management page inside the standard ERP application layout.

### `/pos/workspace`

Now represents the dedicated full-screen selling workspace.

### `/pos/sessions`

Redirects to:

```text
/pos
```

for compatibility with the previous session-history route.

### Other POS routes

Receipts, refund receipts, and Z reports remain part of the normal ERP layout:

```text
/pos/sales/:id
/pos/refunds/:id
/pos/z-reports/:id
```

## Create-session modal

The session-opening modal is intentionally wider than the shared default dialog.

Current responsive width override:

```text
sm:max-w-4xl
```

This is required because the shared `DialogContent` component defines `sm:max-w-md` by default.

The register creation dialog remains smaller at `sm:max-w-lg`.

## Reused implementation

The branch deliberately reuses the existing POS implementation:

- `PosSessionEntity`
- `PosRegisterEntity`
- `PosSessionService`
- existing POS session controller/endpoints
- `OpenSessionScreen`
- `useActivePosSession`
- `useOpenPosSession`
- opening/closing counts
- X Reports
- Z Reports
- branch workspace
- TanStack Query POS cache
- existing POS roles and authorization

No parallel session model, API, service, or state store was added.

## Existing rules preserved

The backend already enforces and continues to enforce:

- one open session per user per branch;
- one open session per register;
- session ownership through `CashierUserId`;
- active register requirements;
- role-based visibility and management;
- manager/owner/superadmin register administration;
- cashier POS access;
- no POS access for Professional users unless that authorization policy is intentionally changed later.

## Query/cache behavior

Opening and closing sessions now also invalidate register queries.

This keeps register availability synchronized after:

- opening a session;
- closing a session.

The existing TanStack Query ownership model is preserved.

## Files changed

### Backend

#### `Api/Modules/Pos/DTOs/PosDtos.cs`

- Added `HasOpenSession` to `PosRegisterResponse`.

#### `Api/Modules/Pos/PosSessionService.cs`

- Derives register occupancy from existing open POS sessions.
- Returns occupancy from register list/detail/create/update responses where applicable.
- Reuses the existing session relationship and business rules.

#### `Api.Tests/PosSessionWorkflowTests.cs`

- Added coverage for register occupancy in register responses.

### Frontend

#### `client/src/app/layout/AppLayout.tsx`

- Only `/pos/workspace` uses the standalone POS layout.
- `/pos` and POS management/report pages use the normal ERP layout.

#### `client/src/app/router.tsx`

- `/pos` now routes to session management.
- Added/uses `/pos/workspace` for the selling workspace.
- `/pos/sessions` redirects to `/pos`.

#### `client/src/features/pos/components/OpenSessionScreen.tsx`

- Reused as an embedded session-opening form.
- Supports preparing a new browser tab from the submit gesture.
- Closes the prepared tab when validation/API creation fails.
- Supports callback after a successful session creation.
- Filters out occupied registers.
- Supports embedded styling inside the ERP dialog.

#### `client/src/features/pos/components/PosCurrencyWorkflow.test.tsx`

- Added coverage for excluding occupied registers from session opening.

#### `client/src/features/pos/hooks/usePos.ts`

- Register availability queries are invalidated when POS sessions open or close.

#### `client/src/features/pos/pages/PosPage.tsx`

- Exit/history actions return to the POS session-management page.
- Closing a session returns the user toward POS management instead of the generic dashboard.

#### `client/src/features/pos/pages/PosSessionsPage.tsx`

Major UX refactor:

- standard ERP page header;
- primary create/continue-session action;
- active-session banner;
- Sessions / Registers / Z Reports tabs;
- shared table shell and table primitives;
- session status filter;
- register table;
- register creation dialog;
- Z-report table;
- wide create-session dialog;
- dedicated new-tab workspace handling.

#### `client/src/features/pos/pages/PosSessionsPage.test.tsx`

Coverage for:

- tab structure;
- shared session table rendering;
- separate register-management tab;
- register table;
- register creation dialog;
- Z-report table;
- session filtering;
- create-session lifecycle;
- new-tab workspace behavior;
- active-session continue behavior;
- occupied-register behavior.

#### `client/src/features/pos/types/pos.types.ts`

- Added `hasOpenSession` to the frontend `PosRegister` contract.

## Files intentionally not changed

The branch does **not** modify:

- POS database entities;
- migrations;
- accounting logic;
- Sales Invoice posting;
- Money Ledger behavior;
- inventory/COGS posting;
- checkout settlement logic;
- refund/reversal accounting;
- X/Z report calculations;
- customer receipts;
- exchange-rate business rules;
- `AGENTS.md`;
- `docs/architecture/backend.md`.

The existing architecture rules were sufficient for this implementation.

## Database impact

**No schema change.**

**No migration required.**

`HasOpenSession` is a derived API field, not a persisted register property.

## Review checklist

When reviewing the branch, verify the following manually:

### Session management

- [ ] `/pos` appears inside the normal ERP layout.
- [ ] Sessions are displayed in the shared table style.
- [ ] Session status filtering works.
- [ ] Current user's open session is clearly identified.
- [ ] Continue/open workspace opens a new tab.

### Session creation

- [ ] Create new session opens the wide session modal.
- [ ] The modal is visibly wider than standard dialogs on desktop.
- [ ] Occupied registers are not selectable.
- [ ] Opening cash counts work as before.
- [ ] Successful creation launches `/pos/workspace` in the prepared new tab.
- [ ] Failed creation closes the blank prepared tab.
- [ ] Popup-blocked flow falls back safely.

### Registers

- [ ] Registers are isolated in their own tab.
- [ ] Register list uses the shared table style.
- [ ] Add Register opens a dialog instead of an inline form.
- [ ] Occupied registers display **In use**.
- [ ] Occupied registers cannot be deactivated.
- [ ] Available registers display **Available**.

### Z Reports

- [ ] Z Reports are isolated in their own tab.
- [ ] Reports use the shared table style.
- [ ] Existing report details still open correctly.

### Layout

- [ ] `/pos/workspace` is standalone/full screen.
- [ ] `/pos` is inside `AppLayout`.
- [ ] receipts/refunds/Z-report pages remain usable inside the normal ERP shell.

## Verification status

GitHub currently reports no CI status checks for the implementation head used to prepare this changelog.

Local build/test execution has **not** been claimed.

Recommended verification:

```bash
dotnet build
dotnet test

cd client
pnpm test -- PosSessionsPage.test.tsx PosCurrencyWorkflow.test.tsx
pnpm lint
pnpm build
```

If Graphify is available in the local repository workflow:

```bash
graphify update .
```

## Out of scope / future work

Not included in this branch:

- new POS-specific settings domain;
- receipt/printer configuration;
- default warehouse/preferences;
- additional POS roles;
- new session database concepts;
- new reporting calculations;
- redesign of the live selling workspace itself.

A future POS Settings tab should only be added when real POS-specific configuration exists rather than creating an empty placeholder tab.
