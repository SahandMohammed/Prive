---
name: prive-mobile-work
description: Build or modify the Privé customer Flutter application using feature-first architecture, Riverpod, go_router, and the mobile architecture rules.
---

# Privé Mobile Work

1. Read:
   - `AGENTS.md`
   - `docs/architecture/mobile.md`

2. Inspect the closest existing Flutter feature before introducing a new pattern.

3. Keep product code inside the owning feature.

4. During the UI-first phase:
   - implement only UI/state code actually needed
   - do not create repositories, APIs, DTOs, persistence, or domain layers speculatively
   - use feature-local fixtures for temporary visual data
   - mark fixtures clearly as temporary

5. Use Riverpod only when meaningful state or orchestration exists.

6. Use `go_router` for application routing.

7. Use existing theme tokens before introducing new styling values.

8. Keep feature-specific widgets inside the feature.

9. Move widgets to `shared/ui/` only when reused by multiple unrelated features.

10. Do not place business rules in Flutter.

11. Prefer Privé customer-facing terminology such as "Master" even if backend terminology differs.

12. Consider relevant:
    - loading
    - empty
    - error
    - selected
    - disabled
      states.

13. Run:
    - `dart format .`
    - `flutter analyze`
    - `flutter test`

14. Review the final diff for:
    - unnecessary abstractions
    - unnecessary dependencies
    - duplicated shared widgets
    - hardcoded theme values
    - incorrect cross-feature imports
