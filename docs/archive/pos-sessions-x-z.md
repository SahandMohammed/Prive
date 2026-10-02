# Archived POS Sessions, X/Z Reports, and Drawer Design

**Status:** superseded by the sessionless POS architecture.

**Source branch:** `feature/pos-session-workspace`  
**Reference commit:** `69f932a7e1fb653dddb2e1bff39f2a810ed17e1d`

The former design modeled POS operations through registers, cashier sessions,
opening and closing counts, drawer movements, X reports, immutable Z-report
snapshots, checkout tenders, and recorded change. Those concepts were removed
from active backend and frontend code when POS checkout became a direct creator
of ordinary posted Sales invoices using the unified Payment engine.

This file exists only to preserve architectural provenance. It is not an active
contract and must not be used to reintroduce compatibility reads, legacy routes,
or reporting reconstruction.

If physical cash-control workflows are required in the future, design them as a
new immutable `DrawerEvent` model linked to Money Account and accounting effects.
That future model should be evaluated independently of checkout identity and
must not restore mutable cashier-session or X/Z snapshot coupling.
