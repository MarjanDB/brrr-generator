---
name: web-app
description: The Nuxt 4 site in app/ — the four-step wizard, component layout, form components, i18n (en + sl), UnoCSS shortcuts and theme colours, charts, the lookup server routes, env config and deployment. Use when changing anything under app/, adding UI text, adding a page or component, or styling.
---

# Web app (`app/`)

Nuxt 4 site at https://taxesgobrrr.com. Everything that touches the user's broker data runs in the browser; the server only answers
company and country lookups. Nuxt's source directory is `app/app/`.

## Running and checking

- `pnpm --filter @brrr/lib build` first, and again after every lib change: the app imports `@brrr/lib` from `lib/dist/`.
- `pnpm dev` (root) for the dev server, `pnpm --filter @brrr/app typecheck`, `pnpm --filter @brrr/app build`, `pnpm lint:fix`.
- Env: `app/util/env.config.ts` (`APP_CONFIG`, zod) reads `app/.env` if present: `PORT`, `HOST`, `NODE_ENV`, and
  `NUXT_PUBLIC_POSTHOG_PUBLIC_KEY` / `NUXT_PUBLIC_POSTHOG_HOST` for analytics.

## The wizard

`app/app/pages/index.vue` is the whole product: one page holding the state of four steps, each a component that emits to move on.

1. **Upload** — `components/ibkr/IbkrUploadStep.vue`: reads the files, runs `BrokerageRegistry.loadAndTransformDetected` and
   `StagingFinancialGroupingProcessor`, emits `FinancialEvents`.
2. **Review** — `components/ibkr/IbkrReviewStep.vue` and `components/ibkr/instrument/` (per-instrument stocks, derivatives, dividends and
   summary, each with a table and a chart); `IbkrGroupingModal.vue`.
3. **Configure** — `components/export/ExportConfigStep.vue`: tax authority cards (`taxAuthorityCards.ts`), then that authority's form
   from `authorityForms` (`SloveniaExportForm.vue`), which calls `TaxAuthorityRegistry.generateExports`.
4. **Download** — `components/export/ExportDownloadStep.vue`, plus the submission guide from `components/download/taxAuthorityGuides.ts`.

Guides (broker export instructions, tax authority submission instructions) are data: `GuideStep`s in `components/guide/guideTypes.ts`,
shown by `GuideModal.vue`, with screenshots under `app/public/screenshots/` and icons under `app/public/icons/`.

`pages/design/` is a design-system showcase (colours, buttons, badges, form controls). Check new shortcuts and components there.

## Using lib in components

- Build a container with `createContainer(new ApiInfoProvider())` and `container.get(...)` the registry you need.
- Hold lib objects (`FinancialEvents`, groupings) in `shallowRef`: they are class instances and shouldn't be made deeply reactive.
- Lookups go through `app/app/utils/ApiInfoProvider.ts` → `app/server/api/isin/[isin].get.ts` and `app/server/api/country/[name].get.ts`,
  which run `NodeInfoProvider` on the server. `Country.treaties` is a `Map` and is sent as a plain object.

## Components

- `components: [{ path: "~/components", pathPrefix: false }]`: components auto-register by file name, without their folder as a prefix,
  so names must be unique across folders. Explicit `~/components/...` imports are also used.
- Folders by area: `upload/`, `ibkr/`, `export/`, `download/`, `guide/`, `form/`, `ui/`.
- Forms: wrap fields in `AppForm` (emits `submit` with `valid`) and use `AppTextInput`, `AppNumberInput`, `AppSelect`, `AppCheckbox`,
  `AppFileInput`. Each takes a `validate` function returning an error string or `null`, registers itself with the surrounding form, and
  links its label through `useId()`.
- Primitives (select, checkbox, dialog, tooltip) come from reka-ui. Composables from `@vueuse/core` before writing your own.
- Charts use chart.js; `composables/useChartTheme.ts` reads theme colours from CSS variables and follows dark mode.
- Biome lints `.vue` files. Pages are exempt from the multi-word component name rule; everything else needs multi-word names.

## Text (i18n)

`@nuxtjs/i18n` with `strategy: "prefix"` (`/en/…`, `/sl/…`). Messages are flat snake_case keys in `app/i18n/locales/en.json` and
`sl.json`; every key goes into both files, in Slovenian too. Use `const { t } = useI18n()` and `t("key")` in components; data files such
as the guides hold keys, not text. Page meta goes through `useSeoMeta` with translated strings.

## Styling

UnoCSS (`presetWind4`, `presetIcons`), configured in `app/unocss.config.ts`:

- Colours are theme names, not raw palette or hex: `primary`, `secondary`, `accent`, `neutral`, `stale`, `success`, `warning`, `error`,
  `info`, each with stops 10–990 backed by CSS variables in `app/app/assets/styles.css`.
- Prefer the shortcuts: `app-text`, `app-text-muted`, `app-border`, `card`, `card-padding-md`, `text-h1`/`h3`/`h5`, `text-label`,
  `text-caption`, `input-md`, `button-filled-<colour>`, `button-inverse-<colour>`, `button-ghost`, `alert-error`, …
- Dark mode is the `dark` class on `<html>`, set from a `color-scheme` cookie by the inline script in `nuxt.config.ts` and
  `plugins/theme.ts` (`$theme`, `$toggleTheme`). Every colour needs its `dark:` counterpart; the shortcuts already have them.
- Icons are classes: `i-mdi-<name>` (Material Design Icons via `@iconify-json/mdi`).

## Build and deploy

- `vite.build.chunkSizeWarningLimit` is 700 kB because the wizard page carries chart.js and the tax engine; keep it just above the
  largest chunk rather than raising it freely.
- `@nuxtjs/seo` prerenders the sitemap and OG images (`zeroRuntime`), so the server bundle holds only the lookup routes.
- The root `Dockerfile` builds lib, then the app, and runs `.output/server/index.mjs`. Publishing a GitHub release force-pushes `master`
  to the `website` branch (`.github/workflows/sync-website-branch.yml`).
