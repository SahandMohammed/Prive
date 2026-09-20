# Privé Customer App — Project Setup

## Goal

Set up the Flutter customer application for Privé Lounge inside the existing Privé repository.

This task is about:

- creating the Flutter project
- establishing folder organization
- defining architecture
- creating project rules
- updating `AGENTS.md`
- creating Flutter-specific Codex skills
- creating architecture documentation
- establishing theme/design foundations
- configuring Riverpod and routing
- preparing the codebase for future ASP.NET Core integration

The current development phase is:

> **UI-first.**

Do not implement backend integration yet.

However, the project structure and architecture must clearly define how backend integration will work later.

---

# 1. Existing System

The existing Privé repository contains:

```text
Prive/
├── Api/
├── Api.Tests/
├── client/
├── docs/
├── .agents/
└── AGENTS.md
```

Backend stack:

```text
ASP.NET Core Web API
.NET 10
PostgreSQL
EF Core
```

Backend architecture:

```text
Api/Modules/<Module>/
```

with:

```text
Controller
Service
DTOs
Entities
Module registration
```

The existing React application is the management application.

The Flutter application is a completely separate **customer-facing experience**.

---

# 2. Flutter Application Location

Create:

```text
Prive/
└── customer_app/
```

Do not create a separate repository.

The resulting root should be:

```text
Prive/
├── Api/
├── Api.Tests/
├── client/
├── customer_app/
├── docs/
├── .agents/
└── AGENTS.md
```

Create Flutter project:

```bash
flutter create \
  --org co.privelounge \
  --project-name prive_customer \
  customer_app
```

---

# 3. Flutter Stack

Use:

```text
Flutter
Dart
flutter_riverpod 3.x
riverpod_annotation
riverpod_generator
go_router
```

Install:

```bash
cd customer_app

flutter pub add \
  flutter_riverpod \
  riverpod_annotation \
  go_router

flutter pub add --dev \
  riverpod_generator \
  build_runner
```

Do not install backend/data dependencies yet.

Specifically do not add yet:

```text
dio
json_serializable
flutter_secure_storage
cookie managers
local databases
Firebase
Freezed
get_it
BLoC
Cubit
```

They will be added only when their functionality is actually required.

---

# 4. Engineering Principles

Prioritize:

1. simplicity
2. readability
3. maintainability
4. correctness
5. consistency
6. accessibility
7. performance where it matters

Avoid:

- overengineering
- premature optimization
- unnecessary abstractions
- architecture for architecture's sake
- speculative layers
- unnecessary dependencies
- generic base classes
- single-implementation interfaces
- fake enterprise architecture
- duplicated design components
- giant `shared/` folders
- generic `utils/`, `helpers/`, `common/`, or `misc/`

Implement the smallest complete design that keeps responsibilities clear.

---

# 5. Overall System Architecture

The final system is:

```text
Flutter Customer App
        ↓ HTTPS
ASP.NET Core Web API
        ↓
PostgreSQL
```

Responsibilities:

```text
Flutter
= presentation
= customer interaction
= UI/application state
= formatting
= navigation

ASP.NET Core
= authoritative business rules
= validation
= authorization
= pricing
= appointment availability
= booking conflict detection
= cancellation rules
= loyalty rules
= persistence

PostgreSQL
= stored business data
```

Flutter must not duplicate backend business rules.

---

# 6. Final Flutter Architecture

When backend integration begins, use:

```text
Screen / Widget
      ↓
Riverpod Controller
      ↓
Repository
      ↓
ApiClient
      ↓
ASP.NET Core API
```

Responsibilities:

```text
Widget / Screen
- render state
- receive user input
- presentation formatting
- trigger controller actions
- navigation triggers

Controller
- feature UI state
- orchestration
- asynchronous state
- call repositories

Repository
- expose feature operations
- communicate with ApiClient
- return typed models

ApiClient
- own Dio
- base URL
- headers
- authentication
- branch/location header
- response envelope unwrapping
- error conversion

.NET API
- authoritative business logic
```

---

# 7. Current UI-First Architecture

During the current phase use:

```text
Screen / Widget
      ↓
Riverpod Controller when needed
      ↓
Temporary fixture/UI state
```

Do not create fake repository/API architecture for mock data.

Example:

```text
booking/
└── ui/
    ├── booking_controller.dart
    ├── booking_state.dart
    ├── fixtures/
    └── screens/
```

Later it becomes:

```text
booking/
├── data/
└── ui/
```

without redesigning the UI layer.

---

# 8. Folder Structure

Create:

```text
customer_app/
├── lib/
│   ├── main.dart
│   │
│   ├── app/
│   │   ├── app.dart
│   │   ├── router.dart
│   │   └── providers.dart
│   │
│   ├── shared/
│   │   └── ui/
│   │       ├── theme/
│   │       │   ├── app_colors.dart
│   │       │   ├── app_spacing.dart
│   │       │   ├── app_radius.dart
│   │       │   ├── app_typography.dart
│   │       │   └── app_theme.dart
│   │       │
│   │       └── widgets/
│   │
│   └── features/
│       ├── onboarding/
│       │   └── ui/
│       │
│       ├── auth/
│       │   └── ui/
│       │
│       ├── home/
│       │   └── ui/
│       │
│       ├── masters/
│       │   └── ui/
│       │
│       ├── booking/
│       │   └── ui/
│       │
│       ├── appointments/
│       │   └── ui/
│       │
│       ├── profile/
│       │   └── ui/
│       │
│       ├── visits/
│       │   └── ui/
│       │
│       └── notifications/
│           └── ui/
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── test/
├── pubspec.yaml
└── analysis_options.yaml
```

Do not create empty `data/` or `domain/` directories yet.

---

# 9. Feature-First Architecture

Features represent **customer capabilities**, not database tables.

Examples:

```text
masters
booking
appointments
profile
visits
notifications
```

Do not force Flutter feature names to match backend module names.

Example:

Backend terminology:

```text
Professional
```

Customer-facing terminology:

```text
Master
```

Flutter may therefore use:

```text
features/masters/
```

even when the backend later exposes a Professional DTO.

Customer UX terminology wins in Flutter.

---

# 10. Feature Structure

A simple feature may be:

```text
features/home/
└── ui/
    └── home_screen.dart
```

A larger feature:

```text
features/masters/
└── ui/
    ├── masters_screen.dart
    ├── master_details_screen.dart
    └── widgets/
        ├── master_card.dart
        └── master_avatar.dart
```

Booking:

```text
features/booking/
└── ui/
    ├── booking_controller.dart
    ├── booking_state.dart
    ├── fixtures/
    │   └── booking_fixture.dart
    ├── screens/
    │   ├── select_master_screen.dart
    │   ├── select_services_screen.dart
    │   ├── select_date_screen.dart
    │   ├── select_time_screen.dart
    │   ├── booking_review_screen.dart
    │   └── booking_success_screen.dart
    └── widgets/
        ├── booking_step_indicator.dart
        ├── service_option.dart
        └── time_slot_tile.dart
```

Do not force identical internal folder layouts across all features.

---

# 11. Riverpod

Riverpod is the only state-management and dependency-injection system.

Do not add:

```text
get_it
provider
BLoC
Cubit
another DI framework
```

Use:

```dart
@riverpod
```

Prefer generated providers.

---

# 12. When to Use a Controller

Do not create a controller for every screen.

Static screen:

```text
AboutScreen
```

does not require:

```text
AboutController
```

Use controllers where meaningful state or orchestration exists.

Examples:

```text
BookingController
AuthController
ProfileEditController
```

Booking needs a controller because state spans multiple screens.

---

# 13. Booking State

Conceptually:

```text
selectedMaster
selectedServices
selectedDate
selectedTime
currentStep
```

Flow:

```text
Choose master
    ↓
Choose services
    ↓
Choose date
    ↓
Choose time
    ↓
Review
    ↓
Confirm
```

The controller owns this temporary state.

Screens should not pass large mutable booking objects manually through route arguments.

---

# 14. Riverpod Example

Example controller:

```dart
@riverpod
class BookingController extends _$BookingController {
  @override
  BookingState build() {
    return const BookingState();
  }

  void selectMaster(Master master) {
    state = state.copyWith(master: master);
  }

  void selectDate(DateTime date) {
    state = state.copyWith(date: date);
  }
}
```

Screen:

```dart
final booking = ref.watch(bookingControllerProvider);
```

Action:

```dart
ref
  .read(bookingControllerProvider.notifier)
  .selectMaster(master);
```

---

# 15. Temporary Mock Data

Mock data is allowed only for UI development.

Keep it feature-local:

```text
features/masters/ui/fixtures/masters_fixture.dart
```

or:

```text
features/booking/ui/fixtures/booking_fixture.dart
```

Every fixture file should state:

```dart
// UI-only fixture.
// Replace with repository data when backend integration begins.
```

Do not create:

```text
lib/mocks/
lib/fake_backend/
lib/global_fixtures/
```

unless a real cross-feature need eventually exists.

---

# 16. Widgets

Widgets are responsible for:

- rendering state
- layouts
- direct interaction
- animations
- navigation triggers
- presentation formatting

Widgets must not:

- access Dio
- call repositories directly
- parse backend envelopes
- contain authentication logic
- calculate authoritative prices
- calculate availability
- decide booking validity

---

# 17. Shared UI

Code starts inside the feature that needs it.

Example:

```text
features/masters/ui/widgets/master_card.dart
```

Only move it to:

```text
shared/ui/widgets/
```

when another unrelated feature genuinely needs the same component.

Do not create a large design-system component library before reuse exists.

---

# 18. Dependency Direction

Allowed:

```text
app → features
app → shared
features → shared
```

Forbidden:

```text
shared → features
```

A feature must not import another feature's internal UI implementation.

Bad:

```dart
import '../masters/ui/widgets/master_card.dart';
```

If a component truly becomes shared, move it to `shared/ui/`.

---

# 19. Routing

Use `go_router`.

Central routing lives in:

```text
lib/app/router.dart
```

Suggested initial routes:

```text
/
/onboarding
/auth
/home
/masters
/masters/:id
/book
/appointments
/appointments/:id
/notifications
/profile
/visits
/visits/:id
```

Keep routing simple.

Do not create deeply nested routing abstractions until needed.

---

# 20. Main Navigation

Likely bottom navigation:

```text
Home
Appointments
Profile
```

Do not place every feature in bottom navigation.

Booking should be reachable through strong actions such as:

```text
Book appointment
```

Masters may be browsed from Home.

Notifications may be opened from the app bar.

---

# 21. App Theme

Privé is a premium men's grooming lounge.

The app should feel:

- premium
- minimal
- calm
- masculine
- refined
- spacious
- intentional

Avoid:

- SaaS dashboard aesthetics
- excessive cards
- glassmorphism
- neon
- arbitrary gradients
- excessive shadows
- excessive border radius
- admin-style dense layouts
- generic AI-generated visual trends

---

# 22. White Theme

Primary theme:

```text
light / white
```

Brand colors should be used selectively for:

- primary CTA
- selected state
- subtle accents
- branded details

Do not make every surface olive.

---

# 23. Design Tokens

Centralize visual constants.

Create:

```text
shared/ui/theme/
├── app_colors.dart
├── app_spacing.dart
├── app_radius.dart
├── app_typography.dart
└── app_theme.dart
```

Example:

```dart
AppSpacing.sm
AppSpacing.md
AppSpacing.lg
```

Use semantic color names:

```dart
AppColors.background
AppColors.surface
AppColors.primary
AppColors.textPrimary
AppColors.textSecondary
AppColors.border
AppColors.error
```

Avoid repeated magic numbers/colors across screens.

---

# 24. Safe Areas

Respect iOS and Android system safe areas.

Background images may extend behind system chrome where visually appropriate.

Interactive content must remain safe.

Do not blindly wrap the whole app in one `SafeArea`.

Apply it at the correct content boundaries.

---

# 25. Responsive Layout

Primary target:

```text
modern phones
```

Do not optimize for one simulator size.

Use:

- Flexible
- Expanded
- constraints
- scroll views
- appropriate padding
- responsive width where needed

Tablet support is not currently a priority.

---

# 26. UI States

Any screen that will eventually use remote data should have visual states for relevant cases:

```text
loading
success
empty
error
disabled
selected
```

Even while using mocked data.

Examples:

Appointments:

```text
loading
no appointments
upcoming appointments
past appointments
error
```

Masters:

```text
loading
masters list
empty
error
```

---

# 27. Accessibility

Ensure:

- reasonable touch targets
- readable contrast
- text scaling support
- semantic labels where needed
- layouts do not collapse with larger text
- state is not communicated through color alone

---

# 28. Future Data Layer

Do not implement this yet.

When backend integration begins, add:

```text
feature/
├── data/
└── ui/
```

Example:

```text
features/appointments/
├── data/
│   ├── appointments_repository.dart
│   └── appointments_dtos.dart
└── ui/
```

---

# 29. Future Repository Pattern

Repositories are concrete classes.

Example:

```dart
class AppointmentsRepository {
  AppointmentsRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<AppointmentResponse>> getUpcoming() async {
    ...
  }

  Future<AppointmentResponse> create(
    CreateAppointmentRequest request,
  ) async {
    ...
  }
}
```

Do not automatically create:

```text
IAppointmentsRepository
AppointmentsRepositoryImpl
```

Testing will use provider overrides or `implements` fakes where needed.

---

# 30. Future Riverpod Dependency Injection

When data integration begins:

```dart
@riverpod
ApiClient apiClient(Ref ref) {
  return ApiClient(...);
}
```

Repository:

```dart
@riverpod
AppointmentsRepository appointmentsRepository(Ref ref) {
  return AppointmentsRepository(
    ref.watch(apiClientProvider),
  );
}
```

Controller:

```dart
final repository = ref.read(appointmentsRepositoryProvider);
```

Do not use service locators.

---

# 31. Future ApiClient

When backend integration starts, create:

```text
shared/api/
├── api_client.dart
├── api_exception.dart
├── auth_interceptor.dart
└── paged.dart
```

`ApiClient` owns:

- Dio
- base URL
- standard headers
- auth header
- branch/location header
- response envelope unwrapping
- API error conversion

Feature code does not decode raw API envelopes.

---

# 32. Existing .NET API Envelope

Backend responses currently follow:

Success:

```json
{
  "success": true,
  "data": {}
}
```

Paginated:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message",
    "traceId": "...",
    "details": []
  }
}
```

204 responses contain no body.

---

# 33. Future ApiException

Every backend failure should become:

```text
ApiException
```

containing:

```text
code
message
statusCode
traceId
details
```

Flow:

```text
.NET response
    ↓
ApiClient
    ↓
ApiException
    ↓
Repository
    ↓
Controller
    ↓
AsyncValue error
    ↓
UI
```

Widgets must never parse raw backend error JSON.

---

# 34. Backend Validation Errors

Backend validation may return:

```json
{
  "code": "VALIDATION_FAILED",
  "details": [
    {
      "field": "phoneNumber",
      "message": "..."
    }
  ]
}
```

When API integration begins:

- field errors should appear near their fields
- submission errors should appear contextually
- use toast/snackbar only for genuinely global feedback

---

# 35. Future DTO Strategy

Mirror API contracts directly unless the UI needs a different shape.

Example backend:

```text
CreateAppointmentRequest
AppointmentResponse
AvailabilityResponse
```

Flutter:

```text
CreateAppointmentRequest
AppointmentResponse
AvailabilityResponse
```

Do not create unnecessary parallel types:

```text
AppointmentDto
AppointmentEntity
AppointmentDomainModel
AppointmentModel
AppointmentMapper
```

One model per concept by default.

---

# 36. Future Serialization

When backend integration begins add:

```text
json_annotation
json_serializable
build_runner
```

Enums must explicitly match backend wire format.

Use:

```text
@JsonValue
@JsonEnum
custom converter
```

as appropriate.

Unknown values must not crash critical parsing when forward compatibility matters.

---

# 37. Date/Time

Backend uses UTC timestamps.

Rule:

```text
parse backend timestamp as UTC
```

Convert to local time only in the presentation/UI layer.

Business logic should not depend on local-device time conversion.

---

# 38. Money

The mobile app should format money.

It should not determine authoritative:

- price
- discount
- subtotal
- total
- loyalty value

Those values come from .NET.

---

# 39. Business Rules

The ASP.NET Core backend remains authoritative for:

```text
appointment availability
professional availability
service duration
pricing
discounts
booking conflicts
cancellations
loyalty
promotion eligibility
```

Flutter may temporarily display fixture values during UI development, but those are visual placeholders.

---

# 40. Booking Backend Flow Later

The final booking flow should become:

```text
Select master
      ↓
BookingController

Select services
      ↓
BookingController

Select date
      ↓
BookingRepository.getAvailability()
      ↓
.NET calculates availability

Select time
      ↓
BookingController

Confirm
      ↓
BookingRepository.create()
      ↓
.NET re-validates availability
      ↓
Appointment created
```

Flutter must never assume a previously shown time slot is still available during confirmation.

---

# 41. Authentication Architecture Later

Do not implement customer authentication until the backend customer-auth contract is decided.

The future flow will be:

```text
AuthScreen
    ↓
AuthController
    ↓
AuthRepository
    ↓
ApiClient
    ↓
.NET customer auth
```

Preferred token ownership:

```text
Access token
→ memory

Refresh token
→ flutter_secure_storage
```

Only auth infrastructure should directly touch tokens.

---

# 42. Auth Interceptor Later

Future `auth_interceptor.dart`:

```text
Request
   ↓
Attach access token
   ↓
API
   ↓
401
   ↓
single refresh attempt
   ↓
new access token
   ↓
retry original request once
```

Concurrent 401 responses must use a **single-flight refresh**.

Do not create multiple simultaneous refresh calls.

If refresh fails:

```text
clear session
→ router redirects to authentication
```

---

# 43. Branch / Location Handling Later

The management app uses:

```text
X-Branch-Id
```

The customer app should represent this as a customer-facing **location**.

Customer may see:

```text
Privé Lounge — Sulaymaniyah
```

not backend branch terminology.

If required, an app-level selected location provider will later supply:

```text
X-Branch-Id
```

to `ApiClient`.

Repositories must not manually attach the branch header.

---

# 44. Riverpod Async Behaviour Later

Use `AsyncValue` for meaningful asynchronous state.

Example:

```text
loading
data
error
```

Provider initialization may retry transient failures according to configured Riverpod retry behaviour.

Non-idempotent operations such as:

```text
create booking
cancel appointment
update profile
```

must never be automatically retried.

They should be explicit controller actions.

---

# 45. Domain Layer

Do not create a `domain/` layer by default.

Only add one when:

1. logic is reused by multiple controllers, or
2. controller code becomes dominated by reusable non-UI application logic

Example:

```text
appointments/domain/appointment_grouping.dart
```

may eventually make sense.

But backend business rules never move into Flutter domain code.

---

# 46. Forbidden Architecture by Default

Do not introduce without a concrete reason:

```text
Clean Architecture boilerplate
repository interfaces with one implementation
use cases forwarding repository calls
remote data sources
local data sources
DTO/entity duplication
mapper layers
base repositories
base controllers
generic service classes
service locators
get_it
BLoC/Cubit alongside Riverpod
micro-packages
feature packages
generic utils/helpers/common directories
premature offline support
premature caching
```

---

# 47. Root AGENTS.md Update

Update root `AGENTS.md`.

Add to context routing:

```markdown
| Flutter customer app work | `docs/architecture/mobile.md` |
```

Add:

```markdown
## Customer mobile app

The Privé customer-facing Flutter application lives in `customer_app/`.

For customer mobile work:

- read `docs/architecture/mobile.md`
- use `.agents/skills/prive-mobile-work/SKILL.md`
- when creating a new Flutter feature, use `.agents/skills/create-prive-mobile-feature/SKILL.md`

The mobile app uses feature-first architecture and Riverpod.

During the UI-first phase, features contain only UI/state code actually required.

Do not introduce speculative repositories, API clients, DTOs, domain layers, persistence, or backend abstractions.

Flutter features represent customer capabilities rather than mirroring backend modules.

The ASP.NET Core API remains authoritative for business rules.
```

---

# 48. Create Mobile Architecture Documentation

Create:

```text
docs/architecture/mobile.md
```

This file becomes the durable source of truth for Flutter architecture.

It should contain:

- project purpose
- stack
- feature-first structure
- Riverpod rules
- routing rules
- UI-first phase
- future repository/API architecture
- dependency direction
- shared UI rules
- backend responsibility boundaries
- testing rules
- authentication architecture direction
- error handling direction
- branch/location direction

Do not put temporary task history in this file.

---

# 49. Create Flutter Work Skill

Create:

```text
.agents/skills/prive-mobile-work/SKILL.md
```

Content:

```markdown
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
```

---

# 50. Create New Mobile Feature Skill

Create:

```text
.agents/skills/create-prive-mobile-feature/SKILL.md
```

Content:

```markdown
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
```

---

# 51. Skill Structure After Setup

Expected:

```text
.agents/
└── skills/
    ├── create-prive-module/
    ├── extend-prive-module/
    ├── prive-backend-work/
    ├── prive-frontend-work/
    ├── prive-mobile-work/
    │   └── SKILL.md
    └── create-prive-mobile-feature/
        └── SKILL.md
```

Do not create more mobile skills yet.

---

# 52. Initial Screens

Prepare feature structure for:

```text
HomeScreen
MastersScreen
MasterDetailsScreen

SelectMasterScreen
SelectServicesScreen
SelectDateScreen
SelectTimeScreen
BookingReviewScreen
BookingSuccessScreen

AppointmentsScreen
AppointmentDetailsScreen

ProfileScreen
EditProfileScreen

VisitsScreen
VisitDetailsScreen

NotificationsScreen

AuthScreen
OnboardingScreen
```

Do not implement all screens with placeholder boilerplate merely to satisfy this list.

Create feature folders and implement screens as UI work begins.

---

# 53. Suggested Development Order

Use:

```text
1. Flutter project creation
2. AGENTS.md update
3. mobile architecture doc
4. Flutter skills
5. app bootstrap
6. theme tokens
7. router
8. main navigation shell
9. Home UI
10. Masters UI
11. Booking flow UI
12. Appointments UI
13. Profile UI
14. Visits UI
15. Notifications UI
16. Auth/onboarding UI
17. backend integration later
```

---

# 54. Generated Code

Never manually edit:

```text
*.g.dart
```

Run:

```bash
dart run build_runner build --delete-conflicting-outputs
```

when Riverpod generation is required.

---

# 55. Formatting and Verification

Before considering setup complete:

```bash
dart format .
flutter analyze
flutter test
```

The Flutter app must compile successfully.

No analyzer errors should remain.

---

# 56. Completion Criteria

This setup task is complete when:

```text
customer_app/
```

exists and compiles.

The repository must contain:

```text
customer_app/
  lib/
    main.dart
    app/
    shared/ui/
    features/

docs/architecture/mobile.md

.agents/skills/prive-mobile-work/SKILL.md

.agents/skills/create-prive-mobile-feature/SKILL.md
```

Root `AGENTS.md` must route Flutter/mobile tasks correctly.

The architecture should clearly support the future flow:

```text
Screen
→ Controller
→ Repository
→ ApiClient
→ ASP.NET Core
```

but this setup task must **not implement the repository/API layer yet**.

---

# Final Rule

Current phase:

```text
Build the customer UI and experience first.
```

Future architecture:

```text
Screen
→ Riverpod Controller
→ Repository
→ ApiClient
→ ASP.NET Core API
```

Backend remains authoritative for business rules.

Do not build future complexity before it is required.
