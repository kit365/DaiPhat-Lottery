# Frontend Architecture (daiphat-fe)

## Layer overview

```
src/
├── api/                    # Axios client + interceptors (single HTTP entry)
├── types/                  # Shared DTOs (ApiResponse, Order, Refund, User…)
├── constants/              # App-wide constants (queryKeys, storage, roles…)
├── shared/auth/            # Auth services used by admin + client
│
├── admin/
│   ├── assets/             # Admin-only icons/assets
│   ├── components/         # Shared admin UI shell (layouts, auth widgets, ui, upload)
│   ├── constants/          # Global admin only (routes, permissions, sidebar, prefetch)
│   ├── context/            # Admin-wide React context
│   ├── hooks/              # Global admin hooks only
│   ├── lib/                # createAdminClientPage, helpers
│   ├── shared/             # Cross-feature utilities (data-grid, upload services)
│   ├── utils/              # Global admin utils
│   └── features/<domain>/  # ALL domain code lives here
│       ├── components/
│       │   ├── pages/      # Route-level page components
│       │   └── sections/   # Page sections, dialogs, toolbars
│       ├── hooks/
│       ├── services/
│       ├── types/
│       ├── utils/
│       ├── constants/
│       ├── configs/        # Column defs, grid configs (optional)
│       └── schemas/        # Zod — form validation only
│
└── client/features|services/
```

**Removed folders (do not reintroduce):** `admin/pages/`, `admin/api/`, `admin/data/`, `admin/schemas/`, `admin/routes/`.

## Feature domains

| Domain | Path |
|--------|------|
| Auth (login, forgot password, profile setup) | `features/auth/` |
| Dashboard & statistics | `features/dashboard/` |
| Settings (general, policies, app password) | `features/settings/` |
| HR (shifts, departments, schedule) | `features/hr/` |
| Refund | `features/refund/` |
| Prize payout | `features/prize-payout/` |
| Review | `features/review/` |
| Orders | `features/orders/` |
| Users / account admin | `features/users/` |
| Street agent | `features/street-agent/` |
| Ticket (import-batch, return-batch, inventory…) | `features/ticket/` |
| … | other domains follow same slice |

## Rules

### Services
- One `BASE_URL` per service file, named exports.
- Return `Promise<ApiResponse<T>>` — do not catch unless degrading gracefully.
- **Do not** duplicate `withAuth()` — `src/api/index.ts` attaches the token.

### constants vs types vs utils
- **constants** (`*.constants.ts`): static values only (status labels, route keys, enums as const).
- **types** (`*.type.ts`): TypeScript interfaces/types for API contracts and UI models.
- **utils** (`*.ts` in `utils/`): pure functions (mappers, badge resolvers, formatters).
- **schemas** (`*.schema.ts`): Zod for forms; infer with `z.infer<typeof schema>`.
- Map form → API payload in submit handler / hook.

### Components
- **pages/** — imported by `app/admin/**/ClientPage.tsx` via `createAdminClientPage`.
- **sections/** — list/toolbar/dialog chunks used by pages in the same feature.
- Shared across features → `admin/components/` or `admin/shared/`.

### React Query
- Global defaults: `throwOnError: false` (see `app/providers.tsx`).
- Optional/public data: `retry: false`.
- Query keys in `constants/queryKeys.ts` per feature (or `src/constants/queryKeys.ts` when shared).

### Dashboard / review placeholders
- Stats without BE endpoints live **inline** in `admin/features/dashboard/services/dashboardService.ts`.
- When BE is ready, replace mock functions with `apiApp.get()` — do not add a separate `data/` folder.

## Reference features
- `admin/features/street-agent/` — full vertical slice
- `admin/features/ticket/import-batch/` — services + utils + tests
- `admin/features/system-config/` — settings integration
- `admin/features/orders/` — constants / types / utils split (e.g. `orderStatus`, `incidentTicket`)

## Auth
- Shared module: `src/shared/auth/`.
- Admin auth UI: `admin/features/auth/components/pages/`.
- Client must **not** import from `admin/features/*` except via routed page entry points.

## Adding a new admin domain

1. `admin/features/<name>/types/`
2. `admin/features/<name>/services/<name>Service.ts`
3. `admin/features/<name>/hooks/use<Name>.ts` + `constants/queryKeys.ts` if needed
4. `admin/features/<name>/schemas/` if forms exist
5. `admin/features/<name>/components/pages/` + `sections/`
6. Wire route via `app/admin/.../ClientPage.tsx` + `createAdminClientPage`
