# design-sync notes for daiphat-fe

## Repo shape (why this run is unusual)

`daiphat-fe` is a Next.js **application**, not a design-system package: `package.json`
is `"private": true` with no `main`/`module`/`exports`, no `dist/`, no Storybook.
There are three loose `components/ui/` folders (`src/admin`, `src/client`, root
`src/components`) that were scoped in as the closest thing to a shared component
library. This is a synth-entry, componentSrcMap-pinned build — see `config.json`.

**Do not let the auto-synth-entry fallback run.** With no `--entry` override,
`package-build.mjs` would `export * from` every `.tsx`/`.jsx` file under `src/`
(the whole app — hundreds of files, many importing server-only/Next.js-specific
APIs that would break esbuild). `.ds-entry.tsx` (repo root, hand-written,
gitignored, regenerate-by-hand) pins the entry to exactly the scoped components
instead. Keep passing `--entry .ds-entry.tsx` on every rebuild — never drop it
to "let auto-discovery run."

**Why `.ds-entry.tsx` lives at the repo root and NOT inside `.ds-sync/`:**
`.ds-sync/package.json` (created for `npm i esbuild ts-morph @types/react`,
per the base skill's staging step) has a `"name"` field. The build script
derives `PKG_DIR` by walking up from `--entry`'s directory to the first
ancestor `package.json` that has a `name` — if the entry file were inside
`.ds-sync/`, that walk stops at `.ds-sync/package.json` instead of reaching
the real `daiphat-fe/package.json`, silently resolving every other
PKG_DIR-relative config path (`cssEntry`, `tsconfig`, `componentSrcMap`
values) one directory too deep. Symptom seen once: `cssEntry`/`tsconfig`
both reported "not found" and every component showed "0 src-matched" despite
`componentSrcMap` being fully populated and correct. Keep the entry file
outside `.ds-sync/`.

## Excluded from this sync (and why)

- **`src/admin/components/ui/Category.tsx`** — dead code. Exports a `Breadcrumb`
  that collides by name with `Breadcrumb.tsx`'s real export, and imports
  `react-router-dom`, which isn't even a dependency of this app. Looks like a
  pre-migration leftover.
- **`src/admin/components/ui/Breadcrumb.tsx`** and **`ListHeader.tsx`** — both
  import `react-router-dom`, which `next.config.ts` webpack-aliases to
  `src/components/router-compat.tsx` (a Next-App-Router-backed shim). esbuild
  has no equivalent alias mechanism exposed via config, AND even if the import
  resolved, `router-compat.tsx`'s hooks (`useNavigate`, `Link`) call
  `next/navigation` APIs that throw outside a real Next.js App Router tree —
  so these would crash on render in an isolated preview regardless. Real fix
  (out of scope for this sync): repoint these two files' own imports at
  `@/components/router-compat` directly instead of the aliased package name —
  then they'd be portable to any bundler, including this one.

## Styling — two systems in scope

- **Admin components** (20 of 27) render via MUI (`@mui/material`, emotion
  CSS-in-JS) + `src/admin/config/theme.ts`'s `adminTheme`. Its CSS variables
  (`--palette-*`, `src/admin/styles/index.css`, 1031 lines) are scoped under an
  `.admin-theme` class, applied at the real app's root (`src/app/admin/layout.tsx`)
  — NOT at `:root`. `cfg.provider` (`DsThemeProvider`, defined inline in
  `.ds-entry.tsx`) reproduces both the `ThemeProvider` and the
  `.admin-theme` wrapper div; without the class wrapper, `var(--palette-*)`
  resolves to nothing and every admin preview renders unstyled even with the
  right CSS loaded.
- **Client + root components** (7 of 27: `Checkbox`, `EmptyStatePlaceholder`,
  `LoadingSpinner`, `PriceDisplay`, `StarRating`, `StatusBadge`, `Skeleton`) use
  raw Tailwind v4 utility classNames (`inline-flex`, `rounded-lg`,
  `bg-slate-200/60`, etc.) — no MUI. esbuild (design-sync's bundler) can't
  process `@import "tailwindcss"` / `@theme` itself, so `cfg.cssEntry` points at
  `.ds-sync/combined-styles.css` — a **flat, pre-concatenated** file containing
  BOTH the admin palette CSS AND a **real compiled** Tailwind build. Both are
  produced by `.ds-sync/compile-tailwind.mjs` (runs the app's own
  `@tailwindcss/postcss` against `src/index.css` with the real `content` glob,
  then concatenates it with `src/admin/styles/index.css`).
  **`cfg.cssEntry` handling reads the file as raw text and appends it verbatim
  — it does NOT resolve `@import`.** An earlier version of `combined-styles.css`
  used `@import "../src/admin/styles/index.css"; @import "./compiled-tailwind.css";`
  and it silently produced a near-empty result: the two `@import` lines landed,
  unresolved, at the END of `_ds_bundle.css` — invalid per the CSS spec (`@import`
  must precede other rules) and inert in every browser. Concatenate content
  directly; never point `cssEntry` at a file that itself `@import`s local files.
  **Re-run `node .ds-sync/compile-tailwind.mjs` before every rebuild if
  `src/index.css`, `src/admin/styles/index.css`, `tailwind.config.ts`, or any
  scoped component's className usage changes** — it's a snapshot, not wired
  into the driver's rebuild step.
- The app's own custom design tokens (`--color-client-primary` etc., defined in
  `src/index.css`'s `@theme` block) do NOT appear in the compiled output —
  Tailwind v4 only emits theme vars for utilities actually referenced
  somewhere in the scanned `content` glob, and none of the 27 scoped
  components use `client-*`-prefixed classes. Non-issue for this scope; would
  need addressing if a future re-sync adds a component that does.

## Fonts

Brand fonts (Barlow, Public Sans) are loaded via `next/font/google`
(`src/styles/fonts.ts`) — self-hosted by Next.js's build pipeline, not
committed as static files anywhere in the repo. `[FONT_MISSING]` also flagged
Inter and Cambria on the first validate pass:

- **Cambria** — confirmed harmless: it's a fallback entry inside Tailwind's
  default `--font-serif` stack (`ui-serif, Georgia, Cambria, ...`), not a
  primary family anything in scope actually requests. No action.
- **Inter** — confirmed real: `Search`, `SelectMulti`, `SelectSingle` all use
  a Tailwind arbitrary-value class (`font-['Inter',sans-serif]`). Fetched
  alongside Barlow/Public Sans (user approved fetching the two *confirmed*
  families; Inter turned out to be a third confirmed one, not a hypothetical
  — included on the same reasoning).

**Resolution** (user-approved): fetched real woff2s from Google Fonts
(Open Font License) for Public Sans, Barlow, and Inter — `latin` +
`vietnamese` subsets only (this is a Vietnamese-content app; skipped
latin-ext/cyrillic/greek). Script: `.ds-sync/fonts/fetch-fonts.mjs`, sourced
from `.ds-sync/fonts/google-fonts.css` (raw Google Fonts CSS2 API response,
fetched once and kept for re-runs — re-fetch it if weights/families change:
`curl -sL -A "Mozilla/5.0 ... Chrome/120" "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Barlow:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" -o .ds-sync/fonts/google-fonts.css`
— the Chrome UA is required or Google serves woff/ttf instead of woff2).
Output: `.ds-sync/fonts/fonts.css` (local-path @font-face rules) +
`.ds-sync/fonts/files/*.woff2` (28 files, ~576KB), wired via `cfg.extraFonts`.

## Environment quirks (this sandbox specifically — may not apply elsewhere)

- No `node`/`npm` on PATH by default; Node 22.16 + npm exist at
  `/mnt/c/Program Files/nodejs/` (Windows-side install reachable from WSL).
  Symlinked `node.exe` to `~/.local/bin/node` to make bare `node` resolve.
- Java/Maven (used for the backend, unrelated to this sync) are similarly only
  reachable via the Windows-side JDK — not relevant here, noted in case a
  future session re-derives the same PATH setup.

## Known render warns (triaged, expected on every re-sync)

Visually confirmed by eye (see the render-check screenshots) — these are
correct renders that just trip the automated size/text heuristics, not
broken components. Do not chase them as regressions:

- `ExportImport` (`[RENDER_BLANK]`) — floor-card default renders only the
  idle-state "more options" icon button; the labeled invite action is
  presumably behind a menu/interaction, not shown in a static default render.
- `LoadingScreen` (`[RENDER_THIN]`) — a centered spinner with no text by
  design; screenshot confirms it renders correctly.
- `Checkbox` (`[RENDER_BLANK]`) — an unchecked, unlabeled checkbox with no
  props supplied; correct default appearance, just visually small.
- `StarRating` (`[RENDER_BLANK]`) — renders 5 correctly-styled orange stars;
  small/compressible PNG trips the <5KB heuristic.
- `Skeleton` (`[RENDER_BLANK]`) — a pale shimmer bar; intentionally subtle by
  design (a loading placeholder), correct as-is.

`Title` WAS in this list (`[RENDER_BLANK]`, genuinely blank — the floor
card's auto-generated crash-safe prop is an empty string for its required
`title: string`, and the floor-card's empty-root fallback doesn't catch
"element exists but text is empty"). Fixed with a one-line authored preview
(`.design-sync/previews/Title.tsx`) rather than left as a known-warn, since
an empty card for a component this foundational isn't a good look even at
floor-card fidelity. If a future re-sync re-flags Title, the preview file may
have been lost — check `.design-sync/previews/` is intact and committed.

## Re-sync risks

- `.ds-entry.tsx` and `.ds-sync/combined-styles.css`/`compiled-tailwind.css`
  are hand-maintained, not derived from `componentSrcMap` automatically — if a
  component is added/removed from `componentSrcMap`, the entry file must be
  edited to match by hand, or the bundle silently diverges from the component
  list (metadata says N components; bundle exports a different set).
- The Tailwind compile step is a manual, un-wired snapshot (see Fonts/Styling
  notes above) — stale on any Tailwind-affecting source change until
  re-run.
- `Breadcrumb.tsx`/`ListHeader.tsx`/`Category.tsx` exclusions are structural
  (real bugs/incompatibilities in the source), not sync preferences — don't
  "helpfully" re-add them without first fixing the underlying router-alias
  issue in the app itself.
- This run scoped preview authoring to floor-cards-only (user's explicit
  choice, given the added complexity above) — all 27 components ship
  functional but unauthored. Rich previews are the standing incremental-sync
  offer.
