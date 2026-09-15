# DaiPhat Mobile Coding Guide

This file is the first document every AI/code agent must read before changing code in `daiphat_mobile`.

The goal of this app is to keep existing user flows stable while moving feature code toward Clean Architecture. Make small, verified changes. Do not reorganize folders unless the feature already uses the same pattern or the task explicitly requires it.

## Before Coding

1. Read this file.
2. Inspect the target feature before editing:
   - `lib/src/features/<feature>/presentation`
   - `lib/src/features/<feature>/domain`
   - `lib/src/features/<feature>/data`
   - related providers in `lib/src/app/bootstrap.dart`
3. Search for current imports and tests with `rg`.
4. Preserve existing UI flow, route names, provider names, API behavior, storage keys, and websocket/session behavior unless the task explicitly asks to change them.
5. Work in small clusters and verify after each feature.

## Project Shape

Main source code lives under:

```text
lib/src/
  app/
  features/
  shared/
```

Feature code should stay inside its feature folder:

```text
lib/src/features/<feature>/
  data/
  domain/
  presentation/
```

Use existing shared code from `lib/src/shared` for network, storage, theme, domain primitives, and common utilities. Do not duplicate shared behavior inside a feature.

## Clean Architecture Rules

Dependency direction must be:

```text
presentation -> domain
data -> domain
app/bootstrap -> data + presentation provider overrides
```

Never import upward or sideways in the wrong direction:

- `domain` must not import `data` or `presentation`.
- `data` must not import `presentation`.
- `presentation` should not instantiate API services, websocket services, or concrete repositories.
- Data models kept for backwards compatibility should re-export domain entities instead of owning business types.

Preferred feature layout:

```text
domain/
  entities/
  repositories/
  usecases/

data/
  models/          # optional compatibility exports or DTO-only files
  services/        # API/websocket/local services
  datasources/     # remote/local data sources when present
  repositories/    # concrete repository implementations

presentation/
  providers/
  viewmodels/
  views/
  widgets/
```

## Domain Layer

Put business-facing types in `domain/entities`.

Put repository contracts in `domain/repositories`.

Put app actions/usecase facades in `domain/usecases`. Use small usecases for simple features and a facade only when a feature has many coordinated operations, such as Chat.

Domain code should be framework-light. Avoid direct Flutter UI, Dio, Hive, SharedPreferences, Firebase, or websocket dependencies in domain contracts unless an existing feature already exposes a stable abstraction.

## Data Layer

Data layer owns concrete integration:

- API services and DTO parsing
- websocket services
- local persistence
- concrete repository implementations

Concrete repositories implement domain repository contracts and translate data/service behavior into domain entities.

If older tests or imports depend on `data/models/<name>.dart`, keep a compatibility export:

```dart
export '../../domain/entities/<name>.dart';
```

Do not move user-visible behavior into data just to satisfy structure. Preserve flow first.

## Presentation Layer

Presentation owns:

- Riverpod providers
- viewmodels/notifiers
- views and widgets
- UI-only mappers, labels, display state, quick replies, and formatting

Presentation should depend on domain contracts/usecases. It should not create `ApiService`, websocket service, or concrete repository instances.

Provider pattern:

```dart
final someRepositoryProvider = Provider<SomeRepository>(
  (ref) => throw UnimplementedError('someRepositoryProvider must be overridden'),
);

final someUseCaseProvider = Provider<SomeUseCase>(
  (ref) => SomeUseCase(ref.watch(someRepositoryProvider)),
);
```

Wire concrete implementations from `lib/src/app/bootstrap.dart`.

## App Wiring

`lib/src/app/bootstrap.dart` is the composition root.

Create concrete services/repositories there and override presentation providers in `ProviderScope`.

Keep wiring explicit:

```dart
final repository = RepositoryImpl(ApiService(dependencies.apiClient));

ProviderScope(
  overrides: [
    repositoryProvider.overrideWithValue(repository),
  ],
)
```

Do not hide production wiring inside presentation providers after a feature has been refactored to Clean Architecture.

## Feature Refactor Checklist

For each feature:

1. Identify current models, services, repositories, providers, viewmodels, and tests.
2. Move business entities/contracts/usecases to `domain`.
3. Make data repositories implement domain contracts.
4. Keep compatibility exports for old data model imports when needed.
5. Update presentation to use domain contracts/usecases.
6. Wire concrete implementations in `bootstrap.dart`.
7. Run import checks:

```powershell
rg "\.\./data|data/models|data/repositories|data/services" lib/src/features/<feature>/presentation lib/src/features/<feature>/domain -n
rg "presentation/" lib/src/features/<feature>/data lib/src/features/<feature>/domain -n
```

8. Run focused verification.

## Verification

Always run the narrowest useful checks after each feature:

```powershell
flutter analyze lib/src/features/<feature> lib/src/app/bootstrap.dart
flutter test <related_test_files>
```

If a feature touches app navigation, auth/session, cart/checkout/payment, chat websocket, or shared providers, run the relevant regression tests too.

Use `dart format` on changed Dart files when it responds normally. If it hangs, continue with `flutter analyze` and fix reported issues manually.

## Git Hygiene

The working tree may contain unrelated user changes. Do not revert them.

Stage only files changed for the requested task. Leave unrelated dirty files alone.

When the user asks for a commit, use the requested message format exactly. For the DP-75 chat refactor series, use:

```text
([ feature/dp-75-chats] fix: your_commit_message)
```

## Design And UI Rules

Respect existing theme and typography:

- Colors: use `AppColors` where available.
- Text: use `AppTypography`.
- Formatting: use shared formatters/utilities before adding new ones.
- UI should match nearby screens and widgets.

Do not replace established feature UI patterns during architecture refactors unless the task specifically asks for visual changes.

## Safety Notes

- Preserve route names and paths.
- Preserve storage keys unless migrating data deliberately.
- Preserve API request/response shapes.
- Preserve websocket topics, event handling, timers, and session cleanup.
- Keep business behavior stable before improving structure.
