# Frontend Architecture (daiphat-fe)

## Layer overview

```
src/
├── api/                    # Axios client + interceptors (single HTTP entry)
├── types/                  # Shared DTOs (ApiResponse, Order, Refund, User…)
├── shared/auth/            # Auth services used by admin + client
│
├── admin/features/<domain>/
│   ├── types/              # API request/response types
│   ├── schemas/            # Zod — form validation only
│   ├── services/           # Thin API calls (no withAuth — interceptor handles token)
│   ├── hooks/              # React Query (queryKey + queryFn)
│   ├── constants/          # queryKeys, feature flags
│   └── components/
│
├── admin/shared/           # Cross-feature admin utilities (upload, data-grid)
└── client/features|services/
```

## Rules

### Services
- One `BASE_URL` per service file, named exports.
- Return `Promise<ApiResponse<T>>` — do not catch unless degrading gracefully.
- **Do not** duplicate `withAuth()` — `src/api/index.ts` attaches the token.

### Schemas vs types
- **Types** (`*.type.ts`): API contracts.
- **Schemas** (`*.schema.ts`): Zod for forms; infer with `z.infer<typeof schema>`.
- Map form → API payload in submit handler / hook.

### React Query
- Global defaults: `throwOnError: false` (see `app/providers.tsx`).
- Optional/public data: `retry: false`.
- Query keys in `constants/queryKeys.ts` per feature.

### Dashboard / review placeholders
- Stats without BE endpoints live **inline** in `admin/features/dashboard/services/dashboardService.ts`.
- When BE is ready, replace mock functions with `apiApp.get()` — do not add a separate `data/` folder.

## Reference features
- `admin/features/street-agent/` — full vertical slice
- `admin/features/ticket/import-batch/` — services + utils + tests
- `admin/features/system-config/` — settings integration

## Auth
- Shared module: `src/shared/auth/` (admin `pages/authen` re-exports for backward compat).
- Client must **not** import from `admin/pages/*` except page components routed via `app/`.

## Adding a new admin domain

1. `admin/features/<name>/types/`
2. `admin/features/<name>/services/<name>Service.ts`
3. `admin/features/<name>/hooks/use<Name>.ts` + `constants/queryKeys.ts`
4. `admin/features/<name>/schemas/` if forms exist
5. Wire route via `app/admin/.../ClientPage.tsx`
