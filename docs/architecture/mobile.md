# Customer Mobile Architecture

## Purpose

`customer_app/` is the Flutter application for Privé Lounge customers. It is a separate customer-facing experience from the React management application, but it remains in the same repository and will later integrate with the existing ASP.NET Core API.

The current phase is UI-first. Build the customer experience and only the state needed to support it. Do not create fake networking or persistence layers around fixture data.

## Stack

- Flutter and Dart
- Riverpod for state management and dependency injection
- Riverpod code generation for declared providers
- `go_router` for application routing
- Flutter's Material 3 components, adapted through Privé theme tokens

Do not introduce a second state-management or dependency-injection framework.

## Project structure

```text
customer_app/lib/
├── main.dart
├── app/
│   ├── app.dart
│   ├── providers.dart
│   └── router.dart
├── features/
│   └── <customer-capability>/
│       └── ui/
└── shared/
    └── ui/
        ├── theme/
        └── widgets/
```

Features describe customer capabilities, such as `booking`, `masters`, `appointments`, `visits`, and `profile`. They do not need to mirror backend module or database names. Customer-facing terminology wins; for example, the app may say “Master” while the backend contract says “Professional.”

A feature starts with only the files it needs. Do not create matching `data/`, `domain/`, `widgets/`, or controller directories by convention.

## Dependency direction

Allowed dependencies are:

```text
app → features
app → shared
features → shared
```

`shared` must not import a feature. A feature must not deep-import another feature's internal UI. Move code to `shared/ui/` only after multiple unrelated features genuinely reuse it.

## UI-first phase

The current flow is:

```text
Screen or widget
        ↓
Riverpod controller, when meaningful state exists
        ↓
Feature-local fixture or UI state
```

Temporary fixture files stay under the owning feature's `ui/fixtures/` directory and must contain:

```dart
// UI-only fixture.
// Replace with repository data when backend integration begins.
```

Do not create repositories, API clients, DTOs, local persistence, or domain layers for fixture data. Do not add Dio, secure storage, databases, Firebase, Freezed, `get_it`, BLoC, or Cubit until a concrete feature requires the relevant capability.

## Riverpod

Riverpod is the only state-management and dependency-injection mechanism.

- Prefer generated providers declared with `@riverpod`.
- Add a controller only when a feature has meaningful state or orchestration.
- Keep state that spans a flow, such as booking selections, in one feature controller rather than passing a large mutable object through routes.
- Use `AsyncValue` for meaningful asynchronous states after data integration begins.
- Use provider overrides to replace dependencies in tests.
- Never automatically retry non-idempotent actions such as creating or cancelling an appointment.

Generated `*.g.dart` files are never edited manually. Regenerate them with:

```bash
dart run build_runner build --delete-conflicting-outputs
```

## Routing

All application routing is declared in `lib/app/router.dart` with `go_router`. Keep the route graph explicit and shallow. Add a route when its screen exists; do not generate placeholder screens merely to fill a route list.

The likely main navigation destinations are Home, Appointments, and Profile. Booking is a focused action, masters are browsed from the customer experience, and notifications are secondary navigation.

Screens trigger navigation, while routing policy stays at the application boundary. Authentication redirects may be added only after the customer-auth contract is defined.

## UI and theme rules

The customer application uses a light, spacious visual language suitable for a premium men's grooming lounge. Brand colors are selective accents, not default surface colors.

Use the semantic tokens in `shared/ui/theme/` for colors, spacing, radius, typography, and component themes. Code begins inside its owning feature; only genuinely reused components move into `shared/ui/widgets/`.

Design for modern phones, text scaling, safe areas, readable contrast, usable touch targets, scrolling, and keyboard interaction. Screens that will load remote data should account for the relevant loading, success, empty, error, selected, and disabled states even while the source is a fixture.

## Future data architecture

Backend integration will use this dependency flow:

```text
Screen or widget
        ↓
Riverpod controller
        ↓
Concrete feature repository
        ↓
Shared ApiClient
        ↓
ASP.NET Core API
```

At that point, add `data/` only to the feature being integrated. Repositories are concrete classes by default. Do not create a repository interface plus implementation, use-case forwarding layers, remote/local data-source layers, duplicate DTO/entity/domain models, base repositories, or base controllers without a demonstrated need.

The future shared API boundary will live under `shared/api/`. `ApiClient` will own Dio, base URL configuration, standard and authentication headers, the selected location header, API envelope unwrapping, and conversion of backend failures into `ApiException`. Widgets and repositories must not parse raw response envelopes.

## Backend responsibility boundary

Flutter owns presentation, customer interaction, UI/application state, formatting, and navigation. The ASP.NET Core API remains authoritative for validation, authorization, pricing, discounts, service duration, availability, booking conflicts, cancellation rules, loyalty, promotions, and persistence.

Fixture values are visual placeholders, never business rules. The API must revalidate availability when a booking is confirmed, even if the selected time was shown as available earlier.

Backend timestamps are parsed as UTC and converted to local time only for presentation. The app formats monetary values but does not calculate authoritative totals.

## API and error direction

The existing API returns success, paginated, and error envelopes. The future `ApiClient` will unwrap these envelopes and expose typed values. Every backend failure becomes an `ApiException` carrying the API error code, message, HTTP status, trace ID, and validation details.

The error path is:

```text
ASP.NET Core response
        ↓
ApiClient → ApiException
        ↓
Repository
        ↓
Controller → AsyncValue error
        ↓
UI
```

Field validation errors appear beside their fields. Submission errors appear in context. Snackbars or toasts are reserved for genuinely global feedback.

## Authentication direction

Do not implement customer authentication until its backend contract is decided. When it is introduced, only authentication infrastructure may read or write tokens. The access token should live in memory and the refresh token in secure storage.

The future authentication interceptor will attach the access token, coordinate concurrent `401` responses through a single refresh operation, retry each original request no more than once, and clear the session when refresh fails. The router can then redirect to authentication.

## Location direction

The backend uses `X-Branch-Id`; the customer experience presents that concept as a location. A future app-level selected-location provider will supply the header to `ApiClient`. Feature repositories must not attach branch headers themselves.

## Testing and verification

- Widget-test meaningful rendering, interaction, navigation, and state transitions.
- Unit-test controllers and reusable pure logic when they contain behavior worth isolating.
- Override Riverpod providers for dependency seams; do not add interfaces solely for mocking.
- Test relevant loading, empty, error, selected, and disabled states.
- Keep tests with the Flutter project under `customer_app/test/`.

Before completing mobile work, run:

```bash
dart format .
flutter analyze
flutter test
```
