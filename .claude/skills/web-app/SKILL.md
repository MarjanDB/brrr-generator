---
name: web-app
description: The Nuxt 4 site in packages/app/ — the four-step wizard, component layout, form components, i18n (en + sl), UnoCSS shortcuts and theme colours, charts, the lookup server routes, env config and deployment. Use when changing anything under packages/app/, adding UI text, adding a page or component, or styling.
---

# Web app (`packages/app/`)

Nuxt 4 site at https://taxesgobrrr.com. Everything that touches the user's broker data runs in the browser; the server only answers
company and country lookups. Nuxt's source directory is `packages/app/app/`.

## Running and checking

- The app imports `@brrr/lib` from `packages/lib/dist/`. `pnpm dev` (root) builds lib, then rebuilds it on every change while
  the dev server runs. For anything else, `pnpm --filter @brrr/lib build` first, and again after every lib change.
- `pnpm dev`, `pnpm --filter @brrr/app typecheck`, `pnpm --filter @brrr/app test`, `pnpm --filter @brrr/app build`, `pnpm lint:fix`.
  One test file: `pnpm --filter @brrr/app exec vitest run <name>`.
- Env: `packages/app/util/env.config.ts` (`APP_CONFIG`, zod) reads `packages/app/.env` if present: `PORT`, `HOST`, `NODE_ENV`, and
  `NUXT_PUBLIC_POSTHOG_PUBLIC_KEY` / `NUXT_PUBLIC_POSTHOG_HOST` for analytics.

## Tests

Vitest runs the app's pure TypeScript only (no DOM, no Vue test utils): the download step's logic under `app/download/` (graph, panel, timeline, sentences). Tests sit
in `__tests__/` beside the code, import `describe`, `expect` and `test` from `vitest` (no globals, unlike lib), import code through the
`~/` and `~~/` aliases (`packages/app/vitest.config.ts`), and need lib built, like `typecheck`. Nuxt ignores `*.test.ts`, so they are
never bundled.

## The wizard

`packages/app/app/pages/index.vue` is the whole product: one page holding the state of four steps, each a component that emits to move on.

1. **Upload** — `components/upload/UploadStep.vue`: reads the files, runs `ReportPipeline.read`, emits the `ImportResult`
   (detections, `FinancialEvents` and the provenance graph).
2. **Review** — `components/review/ReviewStep.vue` and `components/review/instrument/` (per-instrument stocks, derivatives, dividends and
   summary, each with a table and a chart); `InstrumentModal.vue`.
3. **Configure** — `components/configure/ConfigureStep.vue`: tax authority cards (`taxAuthorityCards.ts`), then that authority's form
   from `authorityForms` (`SloveniaExportForm.vue`), which takes the `ImportResult` and calls `ReportPipeline.generate`.
4. **Download** — `components/download/DownloadStep.vue`, receiving `GeneratedOutputs` (the files, the year and lot-matching method, the report's provenance graph and the import). It reads the graph once (`ProvenanceReportReader`) and lays out `DownloadHeader` (form and year, counts, the needs-a-look popover (each item with the file or row it is about) and the warnings popover (each warning with its instrument), guide, downloads, start over), `InstrumentPanel` (the report's instruments by asset type, with search, and an amber badge on a row whose instrument has warnings), `InstrumentHeader`, `InstrumentTimeline` and `FocusFacts` (the focused item's facts and the sentences about it). The logic is plain TypeScript under `app/download/`, tested; the components under `components/download/` only draw. The submission guide comes from `components/download/taxAuthorityGuides.ts`. The step reads facts from node `fields` and sentences from `ProvenanceDetail` and `DropReason`, never from a node's label.

**Download step graph.** Under the timeline, `<LazyGraphView>` (`components/download/graph/`) draws the focused item's provenance. The
engine is plain TypeScript in `app/download/graph/`: `GraphIndex.model(showEveryStep)` → `layoutGraph(model, { focus, expanded })` →
`placeGraph(layout, defaultGraphMetrics)`, with `chainOfNode`/`chainOfEdge` (what a click lights), `captionOf` and `FocusState` (focus,
back trail, lit chain). What a node, caption segment or popover says is built in `app/download/graph/view/` as i18n keys and
parameters (`nodeValueOf`, `captionTextOf`, `popoverContentOf`), and what a click does is `interact()` there, so none of it needs Vue
to be tested. `GraphView` is the only stateful component (`showEveryStep`, the spread stacks, the open popover); the focus lives in
`DownloadStep` as a `FocusState`, which also lights the timeline from the lit chain. The interaction rules:
- A click on a node lights its chain and keeps the focus; a broker row or a report line also opens its popover. A pair card's two rows
  are separate targets; its header opens nothing.
- Only a stub, a double-click or a timeline mark moves the focus (the old one joins the back trail). A left-out node can be lit, never
  followed. A stack spreads on click, and spread stacks fold again when the focus changes.
- A click on empty canvas or Escape clears the light and the popover; an edge's hit area lights the chain through it.
- "Show every step" remaps the focus through `model.nodeFor`, so a focus on a hidden step lands on the visible node beside it.
- The layout must depend on the focus alone: lighting a chain must not redraw the graph, because the chain holds that layout's nodes.
Every icon and tint is a literal class string in `view/nodeLook.ts` (UnoCSS cannot see a built name), numbers go through
`formatNumber`, and all text is built at render with `t()` so a language switch redraws it. A change to the graph starts with a unit
test in `app/download/graph/__tests__/` (or `view/__tests__/`). `GraphView` stays lazy, or the page chunk passes the 700 kB limit.

The page is full width; steps 1 and 3 cap their forms at `max-w-screen-md`.

Guides (broker export instructions, tax authority submission instructions) are data: `GuideStep`s in `components/guide/guideTypes.ts`,
shown by `GuideModal.vue`, with screenshots under `packages/app/public/screenshots/` and icons under `packages/app/public/icons/`.

`pages/design/` is a design-system showcase (colours, buttons, badges, form controls). Check new shortcuts and components there.

## Using lib in components

- Build a container with `createContainer(new ApiInfoProvider())` and `container.get(ReportPipeline)`: `read(files)` gives the
  `ImportResult`, and `generate(imported, request)` gives a report from it. Pass the `ImportResult` between steps; don't rebuild it.
- Hold lib objects (`ImportResult`, `FinancialEvents`, groupings) in `shallowRef`: they are class instances and shouldn't be made
  deeply reactive.
- Lookups go through `packages/app/app/utils/ApiInfoProvider.ts` → `packages/app/server/api/isin/[isin].get.ts` and `packages/app/server/api/country/[name].get.ts`,
  which run `NodeInfoProvider` on the server. `Country.treaties` is a `Map` and is sent as a plain object.

## Components

- `components: [{ path: "~/components", pathPrefix: false }]`: components auto-register by file name, without their folder as a prefix,
  so names must be unique across folders. Explicit `~/components/...` imports are also used.
- Folders by area: `upload/`, `review/`, `configure/`, `download/`, `guide/`, `form/`, `ui/`. The download step's logic lives outside `components/`, in `app/download/` (`graph/`, `panel/`, `timeline/`, `sentences/`, `labels/`).
- Forms: wrap fields in `AppForm` (emits `submit` with `valid`) and use `AppTextInput`, `AppNumberInput`, `AppSelect`, `AppCheckbox`,
  `AppFileInput`. Each takes a `validate` function returning an error string or `null`, registers itself with the surrounding form, and
  links its label through `useId()`.
- Primitives (select, checkbox, dialog, tooltip) come from reka-ui. Composables from `@vueuse/core` before writing your own.
- Charts use chart.js; `composables/useChartTheme.ts` reads theme colours from CSS variables. The review step's charts use a time scale with a hand-written date adapter (`CumulativeLineChart.vue`). The download timeline (`InstrumentTimeline.vue`) needs no adapter: its x axis is a linear scale of epoch milliseconds, ticked by `timelineTicks`, and its arcs and marks are drawn by an inline plugin (`app/download/timeline/timelineMarksPlugin.ts`, never registered globally) over one transparent scatter dataset that gives chart.js the hit-testing and tooltip. The canvas is not keyboard-reachable; the marks are reachable through the panel and `FocusFacts`.
- Biome lints `.vue` files. Pages are exempt from the multi-word component name rule; everything else needs multi-word names.

## Text (i18n)

`@nuxtjs/i18n` with `strategy: "prefix"` (`/en/…`, `/sl/…`). Messages are flat snake_case keys in `packages/app/i18n/locales/en.json` and
`sl.json`; every key goes into both files, in Slovenian too. Use `const { t } = useI18n()` and `t("key")` in components; data files such
as the guides hold keys, not text. Page meta goes through `useSeoMeta` with translated strings. Sentences about enum values (drop reasons, detail kinds, event kinds, categories, lot-matching methods) use `Record<Enum, string>` key maps in `app/download/sentences/sentenceKeys.ts`, so a new enum value fails to compile until it has a key; `LocaleKeys.unit.test.ts` checks that both locale files have the same keys and that every mapped key exists.

## Styling

UnoCSS (`presetWind4`, `presetIcons`), configured in `packages/app/unocss.config.ts`:

- Colours are roles, never palette names or hex. `styles.css` keeps the raw palette (`--stale-150`, …) and, below it, a role block of
  `--color-*` variables; branding changes only that block. `unocss.config.ts` exposes only the roles, so a palette class such as
  `bg-stale-100` compiles to nothing, silently. Neutral roles: `page`, `surface`, `surface-raised`, `surface-hover`, `surface-inverse`,
  `ink`, `ink-muted`, `ink-inverse`, `edge`, `edge-strong`, `edge-subtle`, `overlay`. Each `ColorIntent` (`app/utils/ColorIntent.ts`:
  action, accent, neutral, success, warning, danger, info) has `<intent>`, `-hover`, `-on` (text on the fill), `-soft`, `-ink` and
  `-edge`: `bg-accent text-accent-on`, `border-danger-edge`.
- Class names are written out in full (`AppBadge` maps `ColorIntent` x `BadgeVariant` to literal strings): UnoCSS only sees literals,
  so `` `bg-${color}` `` renders nothing.
- Prefer the shortcuts: `app-text`, `app-text-muted`, `app-border`, `app-surface-raised`, `app-surface-sunken`, `card`, `card-padding-md`, `text-h1`/`h3`/`h5`,
  `text-label`, `text-caption`, `input-md`, `button-filled-<intent>`, `button-ghost`, `alert-error`, …
- There is one theme: no dark mode and no `dark:` classes.
- Icons are classes: `i-mdi-<name>` (Material Design Icons via `@iconify-json/mdi`).

## Build and deploy

- `vite.build.chunkSizeWarningLimit` is 700 kB because the wizard page carries chart.js and the tax engine; keep it just above the
  largest chunk rather than raising it freely. `DownloadStep` is used as `<LazyDownloadStep>` in `pages/index.vue` so the panel,
  timeline and sentences load only once a report exists and stay out of the page chunk; make the next heavy step lazy the same way
  rather than raising the limit.
- `@nuxtjs/seo` prerenders the sitemap and OG images (`zeroRuntime`), so the server bundle holds only the lookup routes.
- The root `Dockerfile` builds lib, then the app, and runs `.output/server/index.mjs`. Publishing a GitHub release force-pushes `master`
  to the `website` branch (`.github/workflows/sync-website-branch.yml`).
