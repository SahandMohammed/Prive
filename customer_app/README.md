# Privé Customer App

The Flutter customer application for Privé Lounge.

## Local development

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

## Verification

```bash
dart format .
flutter analyze
flutter test
```

Architecture and repository rules are documented in [`docs/architecture/mobile.md`](../docs/architecture/mobile.md).
