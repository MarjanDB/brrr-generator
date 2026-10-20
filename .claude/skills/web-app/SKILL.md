---
name: web-app
description: The Nuxt 4 site in packages/app/ — the landing page and the four-step report flow, component layout, form components, i18n (en + sl), UnoCSS shortcuts and theme colours, charts, the lookup server routes, env config and deployment. Use when changing anything under packages/app/, adding UI text, adding a page or component, or styling.
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
switches the locale starts by setting `en`. `app/__tests__/support/Setup.ts` (vitest's `setupFiles`) pins Luxon's zone to
`Europe/Ljubljana`, as lib's setup does, so a report compares with a test case's expected file on any machine. Graph tests build graphs with `utils/__tests__/support/GraphBuilder.ts`. Nuxt ignores
`*.test.ts`, so they are never bundled.

## The landing page

`pages/index.vue` is the way in, rendered on the server: a headline, then `components/landing/LandingFlow.vue`, the brokers on
the left, the mark in the middle and the tax offices on the right, stacked below `lg`.

- The page only presents what the site supports: its cards are information, with nothing to click. The brokers are
  `BROKER_GUIDES` as `LandingBrokerCard`s (the export guides stay in the upload step). The tax offices are `TAX_OFFICES` (`utils/taxOffices.ts`, shapes in `types/taxOffice.ts`): what the site shows
  of each, with no ids. `TAX_AUTHORITY_CARDS` builds on them and adds the `TaxAuthorityId` the configure step picks by.
- `LandingMark` is the one way into the flow, a link to `/report/upload`.
- The arrows render on the server: nothing is measured. Each card's `<li>` holds a `LandingConnector`, a box in the 100px
  gap to the mark, from the card's middle to the card's own point on the mark. Every card in a column is as tall as the
  tallest one (`auto-rows-fr`) and the column shares its middle with the mark, so `landingConnectorOf`
  (`utils/landingConnectors.ts`) can give the box's height as a `calc()` on the card's own height (`100%` inside its row).
  The curve is `edgeCurve` (`utils/edgeCurve.ts`, the one the provenance graph draws its edges with) in a 100 by 100 SVG
  stretched over the box, with a non-scaling stroke; the arrowhead is an SVG of its own. The connectors rely on the mark's
  132px height, the 10px gap between cards and the 100px column gap: change one and change `landingConnectors.ts` with it.
  Stacked, `LandingDownArrow` takes their place. Nothing moves.
- **Nothing the landing page imports may import a value from `@brrr/lib`** (type-only imports are fine). Lib isn't marked free
  of side effects, so one enum import pulls most of it, zod and inversify included, into the page. That is why the tax offices'
  display data, `edgeCurve` and `landingConnectorOf` sit in files of their own.

## The report flow

`pages/report.vue` is the flow's parent; each step is a page under it: `pages/report/upload.vue`, `review.vue`,
`configure.vue` and `download.vue`, at `/<locale>/report/<step>` (`ReportStep` in `types/reportFlow.ts`).

- `report.vue` calls `provideReportFlow()` (`composables/useReportFlow.ts`): the import, whether its review was confirmed and
  the tax authority, with `acceptImport` (clears everything after upload), `confirmReview`, `chooseAuthority` and `startOver`.
  The reports themselves are made on the download step. Each step
  page takes its step's component, passes its emit to the flow and navigates to the next step. The flow lives as long as
  `report.vue`; leaving the flow or reloading drops it, and `definePageMeta({ key: "report" })` keeps it through a language switch.
- How far the flow can go is `furthestStepOf`, and the step a path may show `stepToShow` (`utils/reportFlow.ts`): a step without
  what it needs shows the first step that's missing. `report.vue` redirects once when the flow is opened and in
  `onBeforeRouteUpdate` when moving inside it, before the step renders. Never hide its `NuxtPage` with a `v-if`: that drops
  every kept page.
- Step pages are kept as they were left (`<NuxtPage :keepalive>`), so going back finds the files, the detections and the
  year and tab as they were. `reportPageKey` gives each page a key that changes once what it shows is gone: upload when the flow
  starts over, every later step with a new import.
- `WizardStepper` sits on top and moves between the steps the flow can reach. The flow's pages render in the browser only
  (`routeRules` in `nuxt.config.ts`) and stay out of the sitemap.

The four steps, each a component that emits to move on:

1. **Upload** — `components/upload/UploadStep.vue`: reads the files, runs `ReportPipeline.read`, emits the `ImportResult`
   (detections, `FinancialEvents` and the provenance graph).
2. **Review** — `components/review/ReviewStep.vue` and `components/review/instrument/` (per-instrument stocks, derivatives, dividends and
   summary, each with a table and a chart); `InstrumentModal.vue`, opened by a row (its name is the button a keyboard reaches,
   and gets the focus back on close). `ReviewStep` takes the import's `provenance` graph and calls
   `provideImportSources` once; anything below it reads the rows behind an event with `useImportSources()`. Each trade and cash
   row has a "where from" popover (`components/review/source/`: `RowSourceButton`, mounted-when-open `RowSourcePopover`,
   `FileChip`) showing the export file(s), a "counted once" note for a deduplicated row, the row's key IBKR attributes and an "All
   attributes" toggle. The card is capped at `max-w-screen-md` and has two reka `Tabs`: Instruments (the table) and Issues
   (`ImportIssues.vue`), whose trigger counts what the import left out (amber) and what it counted once (info). The Issues tab
   folds what was left out into one group per sentence, then the rows counted once into one group, each opening to its files
   and rows. `ReviewStep` provides the import sources and reads what was left out itself, so it passes its own sources to
   `useImportLeftOut`. The logic is in `composables/useImportSources.ts`, `composables/useImportLeftOut.ts` and
   `utils/rowAttributes.ts`, with its shapes in `types/importSources.ts`; it reads node kinds, edges and `fields`, and a label only
   as a file's name or a left-out row's own wording.
3. **Tax authority** — `components/configure/ConfigureStep.vue`: the tax authority cards (`utils/taxAuthorityCards.ts`) and Continue,
   which emits the chosen `TaxAuthorityId`. That is all a report needs from the user up front.
4. **Reports** — `components/download/ReportsStep.vue`: a tax year (`TaxYearPicker.vue`, reka's `YearPicker` in an `AppPopover`,
   with `CalendarDate` from `@internationalized/date`; years without a trade or payment in the import, `reportYearsOf` in
   `utils/taxYears.ts`, are disabled, and it opens on `defaultTaxYear`), Start over, and a reka `Tabs` tab per form the authority
   makes (`utils/taxAuthorityForms.ts`: the form's own name for the tab, what it covers for the tab's tooltip, file names, and
   whether its XML carries the taxpayer). `provideTaxYearReports`
   (`composables/useTaxYearReports.ts`, shapes in `types/taxYearReports.ts`) makes every form for the year at once, again when the
   year changes, and hands the step the reports, the taxpayer details given so far and `downloadXml`. A form's lines, CSV and
   provenance don't depend on the taxpayer, so the forms are made with an empty one; the XML is written again on download, with
   the details from `TaxpayerDialog.vue` (all optional but the country, which sets residency; `taxpayerInfoOf` in
   `utils/taxpayer.ts`). A form whose XML has no taxpayer block (D-IFI) downloads it straight away. The details live as long as
   the step and are never stored.
   Each tab holds `components/download/DownloadStep.vue` for its form, receiving `GeneratedOutputs` (the CSV, the file names, the year and lot-matching method, the report's provenance graph and the import) and the form. It reads the graph once (`ProvenanceReportReader`) and lays out `DownloadHeader` (counts, the needs-a-look popover (each item with the file or row it is about) and the warnings popover (each warning with its instrument), guide, the CSV and the XML), `InstrumentPanel` (the report's instruments by asset type, with search, and an amber badge on a row whose instrument has warnings) and the picked instrument's `InstrumentCard`. The card is keyed by its instrument (and the report's year, since node ids are only unique within one report), so it is made afresh for each instrument: its timeline is drawn at its own height and its focus starts on its own first item. `InstrumentCard` calls `provideInstrumentCard` (`composables/useInstrumentCard.ts`) once, which builds the instrument's timeline, what a click can focus, the focus (`provideGraphFocus()`, started on `defaultFocus`), what the report left out or warns about the focused item, the rows of the tabs under the timeline, the open tab, and the trace a timeline click offers. Under the header and the timeline, the card has three reka tabs (`InstrumentCardTab`, styled by `utils/tabClasses.ts` like the forms' tabs): **On the form** (`OnTheFormTable`: the lots on the form with the form's own figures, read from each lot's report lines: the price per unit it was bought and sold at and its net change (the sale's total less the purchase's), in the base currency (`BASE_CURRENCY`, EUR, in `utils/baseCurrency.ts`), with their held time and a total (`formLotsOf`, `formTotalOf`); a dividend payer's payments on the form, `formPaymentsOf`), **Everything detected** (`DetectedTable`: every mark of the timeline by date with its reporting status, `detectedRowsOf(instrument, timeline, year)`: one or more `DetectedPart`s, each a `DetectedReason` (reported on the form; excluded because its lots closed before or after the tax year, the position is still open, it was paid in another year, or for the report's own reason, whose sentence it shows; a corporate action applied to the form's lots or with no effect on them) and, for a trade split between reasons, how much of it each covers; the card's `describeParts` writes each as a verdict, an outlined `AppBadge pill` so it stands out on a selected row too, and its detail, naming the form by its code), and **Trace · …** (`FocusFacts` above `<LazyGraphView>`, which mounts only while its tab is open and follows the focus). A row's click moves the focus. Its row, and the rows the focus lights (a focused sale's lots, a focused lot's trades, the chain picked in the graph), look selected alike, as the timeline outlines them alike; only the focused row is marked `aria-current` (`rowStateAttributes`, `detectedRowStateOf`). The cells at either end of a row are padded so text keeps off a selected row's edges, and its button in the Trace column (`TraceButton`, an icon whose tooltip and label name the item) or `showTrace(node)` moves the focus and opens the Trace tab. Each table scrolls inside `InstrumentTableFrame`, which scrolls the current row (else the first selected one) into its box, between the sticky header and total, never the page. The card's children, `InstrumentHeader`, `InstrumentTimeline`, the tables, `GraphView` and `FocusFacts` (the focused item's facts and the sentences about it), take no props and read the card with `useInstrumentCard()`. The panel's logic is `utils/instrumentPanel.ts` (shapes in `types/instrumentPanel.ts`); an instrument opens on its first sale on the form (`defaultFocus`), else its first dividend on the form, else its first sale or dividend from any year. The timeline's logic is `useInstrumentTimeline` with `utils/instrumentTimeline.ts` (shapes in `types/timeline.ts`). It shows the instrument's whole history, every year, the way interval data is drawn (LifeLines, Gantt): each matched lot is a bar on its own row, from the trade that opened it to the one that closed it (for a written option, the sale, then the buy), and what no lot closed is a bar that stays open to the axis's end; every other mark (corporate actions, dividends, tax, broker lots) is a point on the row under the bars. Each mark and bar is weighed (`TimelineWeight`): `REPORTED` when it became one of the form's lines (`reachesALine`, a walk down that never enters a grouping; a lot when one of its legs did), and for a corporate action when it rebuilt such a trade or happened while a lot on the form was held; everything else is `CONTEXT` (other years' lots, open positions, broker lots FIFO doesn't use). Every sentence comes from `useProvenanceText` (drops, warnings, details, dates, split ratios). The submission guide comes from `utils/taxAuthorityGuides.ts`. The step reads facts from node `fields` and sentences from `ProvenanceDetail` and `DropReason`, never from a node's label.

**Download step graph.** On the card's Trace tab, `<LazyGraphView>` (`components/download/graph/`) draws the focused item's provenance.
Its shapes are plain types in `types/provenanceGraph.ts`. The engine is pure utils: `graphModelOf(graph, reading, showEveryStep)`
(`utils/graphModel.ts`, with lookups such as `modelNodeFor`) → `layoutGraph(model, { focus, expanded, focusable })` →
`placeGraph(layout, defaultGraphMetrics)` (`utils/graphLayout.ts`), and `captionOf` (`utils/graphCaption.ts`).
The layout depends on the focus. A buy or a sale (while lots are drawn as pairs, not with every step) gets a graph of its own (`layoutTrade`): on the left everything that flowed into the trade as it is now (its rows, the trade as first recorded, the corporate actions that rebuilt it; a focus on the trade as first recorded draws the same graph), and nothing that only shares a file or an action with it; then one row per lot (`GraphLayoutNode.row`), in the order of the trade on the other side, with that trade as a stub to follow and why the lot was left out. It has no bands (`GraphLayout.banded` is false), and `placeGraph` lines each row up and centres the trade on its lots (`placeRows`). Anything else (a lot, a payment, a row) gets the stage columns and the Buys/Sells bands.
Three composables hold the rest:
- `useGraphFocus()` (provided by the card, through `provideInstrumentCard`): the focus, the back trail and the lit chain, with `start`, `refocus`, `back`,
  `lightNode`/`lightEdge` (the chain walk) and `remap`. The timeline lights its marks and bars from the lit chain, a click on a mark or a bar refocuses, and a click on nothing clears the light.
  The chain walks the main path's edges; the stubs and stacks hanging off it stay out, but a lit stub's own edge is walked, and a lit
  lot lights the trade on its other side (a stub in a trade's graph), as the timeline lights both ends of a lot's bar.
- `useProvenanceGraph({ graph, reading, focusable })` (in `GraphView`): one model per mode, the layout, placement and caption, "show every
  step", the spread stacks, the open popover (`{ node, anchor }`), and what a click or Escape does.
- `useGraphText()`: what a node, caption segment, split badge or popover says, as finished strings.
The interaction rules:
- Only what the timeline draws can be the focus: a buy, a sale, a lot, a dividend or its tax, a corporate action, a broker lot
  (`focusableOf(timeline)`, on the card). So the timeline always shows where the focus is.
- One click on any of those moves the focus there, in the graph as on the timeline, stub or not (the old focus joins the back trail);
  a trade a corporate action rebuilt stands for the trade it became. The layout gives each card what its click focuses
  (`GraphLayoutNode.follow`, `followTarget`), and the cards only emit the click; there is no double-click.
- A click on the focus, or on anything that can't be focused (a file, a row, a sum, a line, a left-out node), lights its chain and
  keeps the focus; a broker row or a report line also opens its popover. A pair card's two rows are separate targets (on the focused
  lot each opens its line); its header opens nothing. A stack spreads on click, and spread stacks fold again when the focus changes.
- A click on empty canvas or Escape clears the light and the popover; an edge's hit area lights the chain through it. A click
  elsewhere outside the popover closes it and keeps the chain lit. Escape is left to any other open reka layer (a header popover,
  a tooltip, a dialog): the graph's `document` listener skips it while a `[data-dismissable-layer]` is on the page.
- The popover is an `AppPopover` hung on the clicked card (`reference`, found by the card's `data-node-key`), portaled to the body,
  so reka places it and keeps it on screen.
- "Show every step" remaps the focus through `modelNodeFor`, so a focus on a hidden step lands on the visible node beside it.
- The layout must depend on the focus, the spread stacks and what the timeline draws alone: lighting a chain must not redraw the
  graph, because the chain holds that layout's nodes.
Every icon and tint is a literal class string in `utils/nodeLook.ts` (UnoCSS cannot see a built name), numbers go through
`formatNumber` (`utils/provenanceFields.ts`), and all text is built at render through `t()` so a language switch redraws it. A change
to the graph starts with a test in `utils/__tests__/` or `composables/__tests__/`. `GraphView` stays lazy, so the graph loads only
once the download step draws it.

The page is full width; steps 1, 2 and 3 cap their cards at `max-w-screen-md`.

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
  links its label through `useId()`. A select with no visible label (the language switch) takes `ariaLabel`.
- Buttons are `AppButton`: `color` (a `ColorIntent`, filled) or `ghost`, plus `loading` and `disabled`; it renders the
  `button-filled-<intent>` / `button-ghost` shortcut itself, so callers add only layout classes. The `button` shortcut carries
  `app-focus-ring`. A link styled as a button (the downloads) uses the shortcut directly.
- Tooltips, not `title`: `AppTooltip` (or `AppPopover`'s `tooltip`) for any hint, including on the graph's cards. Over a canvas, `AppTooltip` takes a `reference` (a virtual element at the point) and `open`, and lets the pointer through to the chart. `tooltip-box`
  is a small card (the surface, a border, ink text), the look the review step's chart tooltip has; it keeps line
  breaks and wraps at `max-w-80`.
- Primitives (select, checkbox, dialog, tooltip, popover) come from reka-ui. Composables from `@vueuse/core` before writing your own.
- `AppTooltip` has no provider of its own: `app.vue`'s `TooltipProvider` is shared, so moving between neighbouring tooltips
  skips the delay. A reka trigger inside a tooltip takes the tooltip's `data-state`, so style such a trigger by its own ARIA
  state (`aria-pressed:` on the "show every step" `Toggle`), never `data-[state=…]`.
- Pick-one cards are a reka `RadioGroup` (`ConfigureStep` and `TaxAuthorityCard`), disclosures a `Collapsible`, pressed buttons
  a `Toggle`, and `WizardStepper` a `Stepper` (keyboard and ARIA from reka, the look its own).
- Anything that sets `outline-none` or draws its own look adds `app-focus-ring` (a 2px accent outline on `:focus-visible`). It is
  not called `focus-ring`: UnoCSS would read that as the `focus:` variant plus `ring`. The running dev server doesn't reload
  `unocss.config.ts`; restart it after changing a shortcut.
- Dialogs go through `ui/AppDialog.vue`: a `title`, an optional `description` (or `description` slot) read out with it, a
  `DialogSize`, an `icon` slot, a close button named by `dialog_close`, and a `trigger` slot. A dialog opened by code (the
  instrument dialog, one for many rows) passes `returnFocus`, since reka only returns focus to a `DialogTrigger`. Without a
  description, `aria-describedby` is left off, which is what reka's "Missing Description" warning asks for.
- Popovers go through `ui/AppPopover.vue`: a `trigger` slot (or a `reference` element for one opened by code), an optional
  `tooltip` for the trigger, and one box (`card`, `z-50`, collision padding, scrolling past 28rem); width and an `aria-label` pass
  through to the box. Tooltips go through `ui/AppTooltip.vue`; both use the `tooltip-box` shortcut. A reka trigger inside a
  tooltip anchors to the tooltip's popper, so `AppPopover` wraps a tooltip-and-trigger in its own `PopoverAnchor`.
- Charts use chart.js; `composables/useChartTheme.ts` reads theme colours from CSS variables. The review step's charts use a time scale with a hand-written date adapter (`CumulativeLineChart.vue`). The download timeline (`InstrumentTimeline.vue`) needs no adapter: its x axis is a linear scale of epoch milliseconds, ticked by `timelineTicks` for the axis's width (labels at least 64 px apart, so a long holding steps by quarters or years), and its bars and points are drawn by an inline plugin (`utils/timelineMarksPlugin.ts`, never registered globally) over one transparent scatter dataset (every point and each bar's two ends) that gives chart.js the hit-testing; chart.js's own tooltip is off, its `external` hook only reports the mark under the pointer, and the tooltip is `AppTooltip` hung on that mark through a virtual `reference`, so it looks like every other tooltip; the plugin hit-tests the rows itself (`rowAt`). The rows follow the form (`timelineRows`, `TimelineRowKind`): folded, each lot on the form has a row of its own, the lots closed in other years share one faint row and what is still open another (a group of one keeps its own row); a click on a folded row, or the toggle under the chart (shown when `isFoldable`), spreads every bar onto its own row. A click on a mark or a bar moves the focus there (a lot's bar focuses its lot, what is still open the trade that opened it) and, except on the Trace tab, which follows the focus anyway, offers its trace: a small `AppPopover` hung on the clicked point through a virtual reference, saying what the item is (`describeNode`) with **View trace** (`offerTrace`, `dismissOffer`, `offered` in the card; the chart's own tooltip is off while it is open). A click on nothing lets go of the lit chain. Every bar, the triangles at its ends and every point are one size, 16 px (`markSize`), less only where rows are packed tight, whatever the quantity or weight. A lot that is focused or lit, or that the focused trade opened or closed (`barStateOf`), is outlined around its whole shape, the bar and the outer halves of its triangles, 2 px out from every edge (`barOutline`, `offsetPolygon`); a point gets a ring around it. `REPORTED` bars are solid, `CONTEXT` ones faint and dotted, an open one fades out to the right. A bar's label (its quantity and how long it was held, `describeRow`) goes inside it when it fits (`labelFits`), and is left out otherwise. Every quantity on the timeline and in the card's text is written with its unit, shares or an option's contracts, in the locale's plural form (`describeQuantity`, `quantityUnitKeys` with `PluralForm` from `Intl.PluralRules`: Slovenian has one, two, few and other), and every duration in full ("1 year, 6 months", `describeHeld`). Rows sit 34 px apart, closer past twelve rows (`rowPitch`, `timelineYRange`). The report's tax year is a band under the grid (`taxYearSpan`). The canvas is not keyboard-reachable; the marks are reachable through the panel and the tables under the timeline.
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
- Class names are written out in full: UnoCSS only sees literals, so `` `bg-${color}` `` renders nothing. An intent's classes
  come from `utils/intentClasses.ts` (`softIntentClasses`, `solidIntentClasses`, `edgeIntentClasses`), which `AppBadge`,
  `AppCallout`, `InstrumentMonogram`, `nodeLook` and the rest read; don't write another `Record<ColorIntent, string>`.
- UnoCSS scans `.vue` files and, through `content.pipeline.include` in `unocss.config.ts`, the TypeScript in `app/utils/` and
  `app/composables/`. A class or icon written only in a `.ts` file anywhere else is never generated.
- Prefer the shortcuts: `app-text`, `app-text-muted`, `app-border`, `app-surface-raised`, `app-surface-sunken`, `card`, `card-padding-md`, `text-h1`/`h3`/`h5`,
  `text-label`, `text-caption`, `input-md`, `button-filled-<intent>`, `button-ghost`, `alert-error`, `tooltip-box`,
  `app-focus-ring`, `logo-tile` (the light tile every broker and tax office logo sits on, since logos are made for a light page; size the
  `<img>` as the logo plus the tile's padding), and for tables `app-table`, `app-table-head-row`, `app-table-row`, `app-table-th`, `app-table-td` (with a
  `-dense` set for the tables inside a dialog; cells leave alignment to the caller), …
- Shared pieces before hand-written markup: `AppBadge` (`pill` for an outlined chip), `AppCallout` (a tinted line, `as="li"`
  in a list), `InstrumentMonogram` and the graph's `NodeIcon`.
  `pages/design/` shows each of them.
- There is one theme, and it is dark: the roles take the palette's dark stops (`page` is `stale-950`, an intent's fill its `700`),
  `color-scheme: only dark` draws native controls to match, and there is no theme switch and no `dark:` classes. The head
  (`app.head` in `nuxt.config.ts`) says the same before CSS loads, `<meta name="color-scheme" content="only dark">`, so
  the browser's forced dark mode leaves the page alone, and `darkreader-lock` does the same for Dark Reader.
- Icons are classes: `i-mdi-<name>` (Material Design Icons via `@iconify-json/mdi`).

## Build and deploy

- `vite.build.chunkSizeWarningLimit` is 500 kB, just above the largest chunk (the entry: PostHog and i18n); keep it there
  rather than raising it freely. Each page is a chunk of its own: the tax engine (~436 kB) and chart.js (~214 kB) load only
  with the report flow's pages, and the landing page loads neither (see "The landing page"; its mark prefetches the flow only
  when pointed at or focused). Inside the flow, `ReviewStep` uses `<LazyInstrumentModal>` (charts and the row popover) and
  the download step `<LazyGraphView>`; make the next heavy part lazy the same way rather than raising the limit.
- `@nuxtjs/seo` prerenders the sitemap and OG images (`zeroRuntime`), so the server bundle holds only the lookup routes.
- The root `Dockerfile` builds lib, then the app, and runs `.output/server/index.mjs`. Publishing a GitHub release force-pushes `master`
  to the `website` branch (`.github/workflows/sync-website-branch.yml`).
