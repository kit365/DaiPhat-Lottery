## Wrapping and setup

Wrap every tree in `DsThemeProvider` — it applies both the MUI theme (via
`ThemeProvider`) and the `.admin-theme` class that scopes the app's CSS
custom properties. Without it, `var(--palette-*)`/`var(--shape-*)`/
`var(--customShadows-*)` resolve to nothing and admin components render
unstyled (borderless, black-on-white, no elevation):

```jsx
const { DsThemeProvider, LoadingButton, Title } = window.DaiPhatUI;
ReactDOM.createRoot(document.getElementById('ds-root')).render(
  <DsThemeProvider>
    <Title title="Kho vé số" />
    <LoadingButton label="Lưu" variant="contained" />
  </DsThemeProvider>
);
```

`DsThemeProvider` takes no required props — always use it, even for
Tailwind-only components (harmless no-op for them, required for MUI ones).

## Two styling systems — know which a component uses

This library spans two independent styling systems; **never mix their
vocabularies on the same element**.

**MUI components** (`CategoryParentSelect`, `CollapsibleCard`,
`DateRangePicker`, `ExportButton`, `ExportImport`, `Filter`, `ImagePreview`,
`LoadingButton`, `LoadingScreen`, `Search`, `SelectMulti`, `SelectSingle`,
`SettingsList`, `SortButton`, `SwitchButton`, `TabList`, `Title`,
`UploadFiles`, `CategoryTreeSelectGeneric`, `Columns`) — style via the `sx`
prop and CSS custom properties, never Tailwind classNames:

| Purpose | Token examples |
|---|---|
| Color | `var(--palette-primary-main)`, `var(--palette-background-paper)`, `var(--palette-background-default)`, `var(--palette-text-primary)`, `var(--palette-action-hover)` |
| Radius | `var(--shape-borderRadius)`, `var(--shape-borderRadius-sm)`, `var(--shape-borderRadius-md)`, `var(--shape-borderRadius-lg)` |
| Elevation | `var(--customShadows-card)`, `var(--customShadows-dialog)`, `var(--customShadows-dropdown)`, `var(--customShadows-z1)`…`z24` |

```jsx
<Box sx={{
  bgcolor: 'var(--palette-background-paper)',
  borderRadius: 'var(--shape-borderRadius-lg)',
  boxShadow: 'var(--customShadows-card)',
}}>
```

**Tailwind components** (`Checkbox`, `EmptyStatePlaceholder`, `LoadingSpinner`,
`PriceDisplay`, `StarRating`, `StatusBadge`, `Skeleton`) — style via utility
classNames (Tailwind v4, arbitrary-value syntax supported):
`inline-flex`, `items-center`, `gap-1.5`, `rounded-lg`, `bg-slate-200/60`,
`text-slate-400`, `font-bold`. Compose new layout glue the same way — plain
Tailwind utilities, not `sx`.

## Where the truth lives

Read `styles.css` before styling anything new — it's the single stylesheet
entry (`@import`s `_ds_bundle.css`, which holds both the MUI CSS-variable
palette and the compiled Tailwind utilities). Per-component API and a real
usage example live at `components/<group>/<Name>/<Name>.prompt.md` and
`<Name>.d.ts` — read the specific component's `.prompt.md` before using it
for the first time, especially for the app-specific ones (`ExportImport`,
`Filter`, `CategoryParentSelect`, `SettingsList`) whose props aren't
self-evident from the name alone.

## Fonts

Three brand families ship in `fonts/`: **Public Sans** and **Barlow** (the
app's primary sans/display faces) and **Inter** (used by a few admin inputs).
Reach for `font-family: 'Public Sans', sans-serif` or `'Barlow', sans-serif`
for anything MUI/admin-flavored; Tailwind's default sans stack is fine for
Tailwind-flavored components unless matching a specific admin input.
