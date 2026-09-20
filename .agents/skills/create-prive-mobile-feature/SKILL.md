---
name: create-prive-mobile-feature
description: Create a customer-facing Flutter feature for Privé while preserving feature boundaries and the UI-first architecture.
---

# Create Privé Mobile Feature

1. Read:
   - `AGENTS.md`
   - `docs/architecture/mobile.md`

2. Identify the customer capability being added.

3. Create:

   `customer_app/lib/features/<feature>/ui/`

4. Add only files/folders required by the feature.

5. Start with the screen.

6. Add a Riverpod controller only when meaningful state or orchestration exists.

7. Place feature widgets under:

   `ui/widgets/`

8. Place temporary UI fixture data under:

   `ui/fixtures/`

9. Do not create `data/` until actual backend integration begins.

10. Do not create:
    - repository interfaces
    - fake repository architecture
    - DTO layers
    - use cases
    - domain layers
    - base controllers
    - service abstractions

11. Reuse existing design tokens.

12. Register screens through the application's `go_router`.

13. Verify relevant:
    - phone layouts
    - scrolling
    - safe areas
    - keyboard interaction
    - text scaling
    - loading/empty/error states

14. Run:
    - `dart format .`
    - `flutter analyze`
    - `flutter test`
