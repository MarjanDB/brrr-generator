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
- Env is Nuxt's own: the CLI loads `packages/app/.env` for dev, build and preview, and production reads the real environment.
  `NUXT_PUBLIC_POSTHOG_PUBLIC_KEY` / `NUXT_PUBLIC_POSTHOG_HOST` override the runtime config `@posthog/nuxt` sets up, and Nitro
  reads `PORT` / `HOST`. Devtools run only under `nuxt dev`. A new setting goes in `runtimeConfig`, overridden by its `NUXT_`
  variable, not read from `process.env` in `nuxt.config.ts`.

## Tests

Vitest runs every app test inside Nuxt's test environment (`@nuxt/test-utils` with happy-dom, `packages/app/vitest.config.ts`), so
auto-imports and i18n work as in the app. Tests sit in `utils/__tests__/` and `composables/__tests__/`, import `describe`, `expect`
and `test` from `vitest` (no globals, unlike lib), import the code under test explicitly through `~/`, and need lib built, like
`typecheck`. Utils are called directly. A composable runs inside a mounted component through
`composables/__tests__/support/mountComposable.ts` (`mountComposableUnder` for one that injects what a parent provided), and its
text is asserted as the English (or, after `setLocale("sl")`, Slovenian) string; the app is shared between tests, so a test that
switches the locale starts by setting `en`. Graph tests build graphs with `utils/__tests__/support/GraphBuilder.ts`. Nuxt ignores
`*.test.ts`, so they are never bundled.

## The wizard

`packages/app/app/pages/index.vue` is the whole product: one page holding the state of four steps, each a component that emits to move on.

1. **Upload** — `components/upload/UploadStep.vue`: reads the files, runs `ReportPipeline.read`, emits the `ImportResult`
   (detections, `FinancialEvents` and the provenance graph).
2. **Review** — `components/review/ReviewStep.vue` and `components/review/instrument/` (per-instrument stocks, derivatives, dividends and
   summary, each with a table and a chart); `InstrumentModal.vue`, opened by a row (its name is the button a keyboard reaches,
   and gets the focus back on close). `ReviewStep` takes the import's `provenance` graph and calls
   `provideImportSources` once; anything below it reads the rows behind an event with `useImportSources()`. Each trade and cash
   row has a "where from" popover (`components/review/source/`: `RowSourceButton`, mounted-when-open `RowSourcePopover`,
   `FileChip`) showing the export file(s), a "counted once" note for a deduplicated row, the row's key IBKR attributes and an "All
   attributes" toggle. Above the table, `ImportLeftOutNote.vue` lists what the import left out (amber) and what it counted once
   (info badge). The logic is in `composables/useImportSources.ts`, `composables/useImportLeftOut.ts` and
   `utils/rowAttributes.ts`, with its shapes in `types/importSources.ts`; it reads node kinds, edges and `fields`, and a label only
   as a file's name or a left-out row's own wording.
3. **Configure** — `components/configure/ConfigureStep.vue`: tax authority cards (`utils/taxAuthorityCards.ts`), then that authority's form
   from `authorityForms` (`SloveniaExportForm.vue`), which takes the `ImportResult` and calls `ReportPipeline.generate`.
4. **Download** — `components/download/DownloadStep.vue`, receiving `GeneratedOutputs` (the files, the year and lot-matching method, the report's provenance graph and the import). It reads the graph once (`ProvenanceReportReader`) and lays out `DownloadHeader` (form and year, counts, the needs-a-look popover (each item with the file or row it is about) and the warnings popover (each warning with its instrument), guide, downloads, start over), `InstrumentPanel` (the report's instruments by asset type, with search, and an amber badge on a row whose instrument has warnings), `InstrumentHeader`, `InstrumentTimeline` and `FocusFacts` (the focused item's facts and the sentences about it). `DownloadStep` calls `provideGraphFocus()` for the focus every part of the step shares. The panel's logic is `utils/instrumentPanel.ts` (shapes in `types/instrumentPanel.ts`), the timeline's `useInstrumentTimeline` with `utils/instrumentTimeline.ts` (shapes in `types/timeline.ts`), and every sentence comes from `useProvenanceText` (drops, warnings, details, dates, split ratios). The submission guide comes from `utils/taxAuthorityGuides.ts`. The step reads facts from node `fields` and sentences from `ProvenanceDetail` and `DropReason`, never from a node's label.

**Download step graph.** Under the timeline, `<LazyGraphView>` (`components/download/graph/`) draws the focused item's provenance.
Its shapes are plain types in `types/provenanceGraph.ts`. The engine is pure utils: `graphModelOf(graph, reading, showEveryStep)`
(`utils/graphModel.ts`, with lookups such as `modelNodeFor`) → `layoutGraph(model, { focus, expanded })` →
`placeGraph(layout, defaultGraphMetrics)` (`utils/graphLayout.ts`), and `captionOf` (`utils/graphCaption.ts`).
Three composables hold the rest:
- `useGraphFocus()` (provided by `DownloadStep`): the focus, the back trail and the lit chain, with `start`, `refocus`, `back`,
  `lightNode`/`lightEdge` (the chain walk) and `remap`. The timeline lights its marks from the lit chain, and a mark click refocuses.
- `useProvenanceGraph({ graph, reading })` (in `GraphView`): one model per mode, the layout, placement and caption, "show every
  step", the spread stacks, the open popover (`{ node, anchor }`), and what a click or Escape does.
- `useGraphText()`: what a node, caption segment, split badge or popover says, as finished strings.
The interaction rules:
- A click on a node lights its chain and keeps the focus; a broker row or a report line also opens its popover. A pair card's two rows
  are separate targets; its header opens nothing.
- Only a stub, a double-click or a timeline mark moves the focus (the old one joins the back trail). A left-out node can be lit, never
  followed. A stack spreads on click, and spread stacks fold again when the focus changes.
- A click on empty canvas or Escape clears the light and the popover; an edge's hit area lights the chain through it. A click
  elsewhere outside the popover closes it and keeps the chain lit. Escape is left to any other open reka layer (a header popover,
  a tooltip, a dialog): the graph's `document` listener skips it while a `[data-dismissable-layer]` is on the page.
- The popover is an `AppPopover` hung on the clicked card (`reference`, found by the card's `data-node-key`), portaled to the body,
  so reka places it and keeps it on screen.
- "Show every step" remaps the focus through `modelNodeFor`, so a focus on a hidden step lands on the visible node beside it.
- The layout must depend on the focus alone: lighting a chain must not redraw the graph, because the chain holds that layout's nodes.
Every icon and tint is a literal class string in `utils/nodeLook.ts` (UnoCSS cannot see a built name), numbers go through
`formatNumber` (`utils/provenanceFields.ts`), and all text is built at render through `t()` so a language switch redraws it. A change
to the graph starts with a test in `utils/__tests__/` or `composables/__tests__/`. `GraphView` stays lazy, or the page chunk passes
the 700 kB limit.

The page is full width; steps 1 and 3 cap their forms at `max-w-screen-md`.

Guides (broker export instructions, tax authority submission instructions) are data (`utils/brokerGuides.ts`, `utils/taxAuthorityGuides.ts`):
`GuideStep`s from `types/guide.ts`, shown by `GuideModal.vue` (its `trigger` slot holds the button that opens it: each broker in
step 1, the guide button in the download header), with screenshots under `packages/app/public/screenshots/` and icons under `packages/app/public/icons/`.

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
- `components/` holds only `.vue` files, in folders by area: `upload/`, `review/`, `configure/`, `download/`, `guide/`, `form/`, `ui/`.
  Logic goes in `composables/` (state, reactivity, i18n; `provideX`/`useX` for state a whole step shares), `utils/` (pure helpers
  several files use) and `types/` (shapes and enums several files use, one file per feature), never in a folder of its own. The app
  has no classes; shapes are plain types built as object literals. Nuxt auto-imports composables and utils (top-level files only), so
  components and composables use them without import lines and their exported names must be unique.
- Forms: wrap fields in `AppForm` (emits `submit` with `valid`) and use `AppTextInput`, `AppNumberInput`, `AppSelect`, `AppCheckbox`,
  `AppFileInput`. Each takes a `validate` function returning an error string or `null`, registers itself with the surrounding form, and
  links its label through `useId()`.
- Primitives (select, checkbox, dialog, tooltip, popover) come from reka-ui. Composables from `@vueuse/core` before writing your own.
- Dialogs go through `ui/AppDialog.vue`: a `title`, an optional `description` (or `description` slot) read out with it, a
  `DialogSize`, an `icon` slot, a close button named by `dialog_close`, and a `trigger` slot. A dialog opened by code (the
  instrument dialog, one for many rows) passes `returnFocus`, since reka only returns focus to a `DialogTrigger`. Without a
  description, `aria-describedby` is left off, which is what reka's "Missing Description" warning asks for.
- Popovers go through `ui/AppPopover.vue`: a `trigger` slot (or a `reference` element for one opened by code), an optional
  `tooltip` for the trigger, and one box (`card`, `z-50`, collision padding, scrolling past 28rem); width and an `aria-label` pass
  through to the box. Tooltips go through `ui/AppTooltip.vue`; both use the `tooltip-box` shortcut. A reka trigger inside a
  tooltip anchors to the tooltip's popper, so `AppPopover` wraps a tooltip-and-trigger in its own `PopoverAnchor`.
- Charts use chart.js; `composables/useChartTheme.ts` reads theme colours from CSS variables. The review step's charts use a time scale with a hand-written date adapter (`CumulativeLineChart.vue`). The download timeline (`InstrumentTimeline.vue`) needs no adapter: its x axis is a linear scale of epoch milliseconds, ticked by `timelineTicks`, and its arcs and marks are drawn by an inline plugin (`utils/timelineMarksPlugin.ts`, never registered globally) over one transparent scatter dataset that gives chart.js the hit-testing and tooltip. The canvas is not keyboard-reachable; the marks are reachable through the panel and `FocusFacts`.
- A popover inside a reka `Dialog` needs `PopoverPortal` (the dialog is translated and clips overflow); `AppPopover` portals, and
  its `z-50` sits above the dialog because it is appended to the body after it.
- Biome lints `.vue` files. Pages are exempt from the multi-word component name rule; everything else needs multi-word names.

## Text (i18n)

`@nuxtjs/i18n` with `strategy: "prefix"` (`/en/…`, `/sl/…`). Messages are flat snake_case keys in `packages/app/i18n/locales/en.json` and
`sl.json`; every key goes into both files, in Slovenian too. Use `const { t } = useI18n()` and `t("key")` in components; data files such
as the guides hold keys, not text. Page meta goes through `useSeoMeta` with translated strings. Sentences about enum values (drop reasons, detail kinds, event kinds, categories, lot-matching methods) use `Record<Enum, string>` key maps in `utils/i18nKeys.ts`, so a new enum value fails to compile until it has a key; `utils/__tests__/LocaleKeys.unit.test.ts` checks that both locale files have the same keys and that every mapped key exists. vue-i18n takes a bare `@` to start a linked message and then fails to compile the whole locale file in the browser, so a literal `@` is written `{'@'}`; the same test rejects a bare one.

## Styling

UnoCSS (`presetWind4`, `presetIcons`), configured in `packages/app/unocss.config.ts`:

- Colours are roles, never palette names or hex. `styles.css` keeps the raw palette (`--stale-150`, …) and, below it, a role block of
  `--color-*` variables; branding changes only that block. `unocss.config.ts` exposes only the roles, so a palette class such as
  `bg-stale-100` compiles to nothing, silently. Neutral roles: `page`, `surface`, `surface-raised`, `surface-hover`, `surface-inverse`,
  `ink`, `ink-muted`, `ink-inverse`, `edge`, `edge-strong`, `edge-subtle`, `overlay`. Each `ColorIntent` (`app/types/ui.ts`:
  action, accent, neutral, success, warning, danger, info) has `<intent>`, `-hover`, `-on` (text on the fill), `-soft`, `-ink` and
  `-edge`: `bg-accent text-accent-on`, `border-danger-edge`.
- Class names are written out in full (`AppBadge` maps `ColorIntent` x `BadgeVariant` to literal strings): UnoCSS only sees literals,
  so `` `bg-${color}` `` renders nothing.
- UnoCSS scans `.vue` files and, through `content.pipeline.include` in `unocss.config.ts`, the TypeScript in `app/utils/` and
  `app/composables/`. A class or icon written only in a `.ts` file anywhere else is never generated.
- Prefer the shortcuts: `app-text`, `app-text-muted`, `app-border`, `app-surface-raised`, `app-surface-sunken`, `card`, `card-padding-md`, `text-h1`/`h3`/`h5`,
  `text-label`, `text-caption`, `input-md`, `button-filled-<intent>`, `button-ghost`, `alert-error`, …
- There is one theme: no dark mode and no `dark:` classes.
- Icons are classes: `i-mdi-<name>` (Material Design Icons via `@iconify-json/mdi`).

## Build and deploy

- `vite.build.chunkSizeWarningLimit` is 700 kB because the wizard page carries chart.js and the tax engine; keep it just above the
  largest chunk rather than raising it freely. `DownloadStep` is used as `<LazyDownloadStep>` in `pages/index.vue` so the panel,
  timeline and sentences load only once a report exists and stay out of the page chunk, and `ReviewStep` uses
  `<LazyInstrumentModal>` (charts and the row popover) for the same reason; make the next heavy step lazy the same way
  rather than raising the limit.
- `@nuxtjs/seo` prerenders the sitemap and OG images (`zeroRuntime`), so the server bundle holds only the lookup routes.
- The root `Dockerfile` builds lib, then the app, and runs `.output/server/index.mjs`. Publishing a GitHub release force-pushes `master`
  to the `website` branch (`.github/workflows/sync-website-branch.yml`).
