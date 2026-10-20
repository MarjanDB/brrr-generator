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
auto-imports and i18n work as in the app. Tests sit in a `__tests__/` beside the code they cover (`utils/__tests__/`,
`composables/__tests__/`, `composables/provenanceGraph/__tests__/`, `components/landing/__tests__/`), import `describe`, `expect`
and `test` from `vitest` (no globals, unlike lib), import the code under test explicitly through `~/`, and need lib built, like
`typecheck`. Utils and a composable's modules are called directly, and what is private to a composable is tested through it. A
component's own logic is tested by mounting it (`mountSuspended`) and reading what it renders (`LandingPrinter`, `LandingBrokerCard`), and a route
it fetches is mocked with `registerEndpoint` (`useCountries`, `useInfoProvider`). A composable runs inside a mounted component through
`composables/__tests__/support/mountComposable.ts` (`mountComposableUnder` for one that injects what a parent provided), and its
text is asserted as the English (or, after `setLocale("sl")`, Slovenian) string; the app is shared between tests, so a test that
switches the locale starts by setting `en`. `app/__tests__/support/Setup.ts` (vitest's `setupFiles`) pins Luxon's zone to
`Europe/Ljubljana`, as lib's setup does, so a report compares with a test case's expected file on any machine. Graph tests build graphs with `utils/__tests__/support/GraphBuilder.ts`. Nuxt ignores
`*.test.ts`, so they are never bundled.

## The landing page

`pages/index.vue` is the way in, rendered on the server: a headline, then `components/landing/LandingFlow.vue`, the brokers on
the left, the money printer in the middle and the tax offices on the right, stacked below `lg`.

- The page only presents what the site supports: its cards are information, with nothing to click. The brokers are
  `BrokerGuides.all` as `LandingBrokerCard`s (the export guides stay in the upload step). The tax offices are `TaxOffices.all` (`utils/taxOffices.ts`, shapes in `types/taxOffice.ts`): what the site shows
  of each, with no ids. `TaxAuthorityCards.all` builds on them and adds the `TaxAuthorityId` the configure step picks by.
- The brokers' cards list what the site reads from each export (`BrokerGuide.readKeys`), as the tax offices' list the forms
  they take (`formKeys`), both as neutral `AppBadge pill`s, so the printer's colour is the only one in the row.
- `LandingPrinter` is the one way into the flow, a link to `/report/upload` named "Start a report", which is also the label under
  it. It is an inline SVG in the action colours: the export goes in on the left as an XML sheet and plain forms (no
  country's form names) come out on the right. Its box is centred on the printer's body, not on the paper, so the body lines
  up with the headline, its label and the cards' middles; the paper on each side reaches about as far. There are no arrows:
  the paper shows the way, and the 36px column gap either side stays open. An illustration that later replaces the printer
  takes the same box.
- **Nothing the landing page imports may import a value from `@brrr/lib`** (type-only imports are fine). Lib isn't marked free
  of side effects, so one enum import pulls most of it, zod and inversify included, into the page. That is why the tax offices'
  display data sits in a file of its own.

## The report flow

`pages/report.vue` is the flow's parent; each step is a page under it: `pages/report/upload.vue`, `review.vue`,
`configure.vue` and `download.vue`, at `/<locale>/report/<step>` (`ReportStep` in `types/reportFlow.ts`).

- `report.vue` calls `provideReportFlow()` (`composables/useReportFlow.ts`): the import, whether its review was confirmed,
  the tax authority and the dividend payers defined by hand (`payers`, `DefinedPayer`s by ISIN), with `acceptImport` (clears
  the review and the authority), `confirmReview`, `chooseAuthority`, `definePayer`/`removePayer` and `startOver` (clears
  everything, payers included: they are kept for the session only, never stored).
  The reports themselves are made on the download step. Each step
  page takes its step's component, passes its emit to the flow and navigates to the next step. The flow lives as long as
  `report.vue`; leaving the flow or reloading drops it, and `definePageMeta({ key: "report" })` keeps it through a language switch.
- How far the flow can go is its `furthestStep`, the step a path names `stepOfPath`, and the step a page may show
  `stepShownFor`: a step without what it needs shows the first step that's missing. `report.vue` redirects once when the flow is opened and in
  `onBeforeRouteUpdate` when moving inside it, before the step renders. Never hide its `NuxtPage` with a `v-if`: that drops
  every kept page.
- Step pages are kept as they were left (`<NuxtPage :keepalive>`), so going back finds the files, the detections and the
  year and tab as they were. The flow's `pageKeyOf` gives each page a key that changes once what it shows is gone: upload when the flow
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
   (`ImportIssues.vue`), whose trigger counts everything it lists. When the import left something out, a red `IssueButton` above
   the instruments table says how much ("1 item was left out of the import") and opens the Issues tab. The Issues tab
   folds what was left out into one group per sentence, then the rows counted once into one group, each opening to its files
   and rows. `ReviewStep` provides the import sources and reads what was left out itself, so it passes its own sources to
   `useImportLeftOut`. The logic is in `composables/useImportSources.ts` (which also gives a row's `keyAttributesOf` and
   `allAttributesOf`) and `composables/useImportLeftOut.ts`, with its shapes in `types/importSources.ts`; it reads node kinds, edges and `fields`, and a label only
   as a file's name or a left-out row's own wording.
3. **Tax authority** — `components/configure/ConfigureStep.vue`: the tax authority cards (`TaxAuthorityCards.all`) and Continue,
   which emits the chosen `TaxAuthorityId`. That is all a report needs from the user up front.
4. **Reports** — `components/download/ReportsStep.vue`: a tax year (`TaxYearPicker.vue`, reka's `YearPicker` in an `AppPopover`,
   with `CalendarDate` from `@internationalized/date`; years without a trade or payment in the import are disabled), Start
   over, and a reka `Tabs` tab per form the authority makes (the form's own name for the tab, what it covers for the tab's
   tooltip, file names, and whether its XML carries the taxpayer). `provideTaxYearReports`
   (`composables/useTaxYearReports.ts`, shapes in `types/taxYearReports.ts`) holds the authority's `forms`, the `years` the
   import can make reports for and the `year` the picker binds to (opening on last year, given `today`), makes every form for
   the year at once, again when the year or the payers defined by hand change, and hands the step the reports, the taxpayer
   details given so far and `downloadXml`. Before each run it gives the step's lookups (`useInfoProvider()`) the payers as they are (`defineCompany`, and
   `removeCompany` for one taken away), and while it runs it keeps the last reports, under a "Making the forms…" note, so the
   open tab, the selected instrument and the selected problem stay where they were. A form's lines, CSV and
   provenance don't depend on the taxpayer, so the forms are made with an empty one; the XML is written again on download, with
   the details from `TaxpayerDialog.vue` (all optional but the country, which sets residency). A form whose XML has no
   taxpayer block (D-IFI) downloads it straight away. The details live as long as
   the step and are never stored.
   Each tab holds `components/download/DownloadStep.vue` for its form, receiving `GeneratedOutputs` (the CSV, the file names, the year and lot-matching method, the report's provenance graph and the import) and the form. It reads the graph once (`ProvenanceReportReader`) and lays out `DownloadHeader` (a summary line, "4 lines on the form, 7 items not on it"; the report step's own problems (the reading's `needsALook` and `warnings`, never the import's, which are the review step's) as `IssueButton`s, red for what needs a look and amber for the warnings still open, each opening the Problems tab, or "No issues"; the CSV link follows the report when it is made again; the guide and the CSV as secondary buttons and the XML as the one primary), `InstrumentPanel` (the report's instruments by asset type, each group headed by its name and count, with search, and an amber icon and number on a row whose instrument has warnings) and the picked instrument's `InstrumentCard`. The panel's state is `useInstrumentPanel` (the sections, the picked instrument, where its card starts and the card's key), and a report made again keeps the instrument it showed (`InstrumentPanels.sameEntryIn`, by kind, ticker, ISIN and contract). The card is keyed by its instrument and by how many reports the step has shown (node ids are only unique within one report), so it is made afresh for each instrument and each report: its timeline is drawn at its own height and its focus starts on its own first item. `InstrumentCard` calls `provideInstrumentCard` (`composables/useInstrumentCard.ts`) once, which builds the instrument's timeline, what a click can focus, the focus (`provideGraphFocus()`, started on the card's `startAt` when a problem asked to show an item, else on `ReportInstruments.defaultFocus`), what the report left out or warns about the focused item, the rows of the tabs under the timeline, the open tab, and the trace a timeline click offers. Under the header and the timeline, the card has three reka tabs (`InstrumentCardTab`, styled by `TabClasses` like the forms' tabs): **On the form** (`OnTheFormTable`: the lots on the form with the form's own figures, read from each lot's report lines: the price per unit it was bought and sold at and its net change (the sale's total less the purchase's), in the base currency (`Currencies.base`, EUR), with their held time and a total (`InstrumentRows.formLotsOf`, `formTotalOf`, in `composables/instrumentCard/`); a dividend payer's payments on the form, `formPaymentsOf`), **Everything detected** (`DetectedTable`: every mark of the timeline by date with its reporting status, `InstrumentRows.detectedRowsOf(instrument, timeline, year)`: one or more `DetectedPart`s, each a `DetectedReason` (reported on the form; excluded because its lots closed before or after the tax year, the position is still open, it was paid in another year, or for the report's own reason, whose sentence it shows; a corporate action applied to the form's lots or with no effect on them) and, for a trade split between reasons, how much of it each covers; the card's `describeParts` writes each as a verdict, an outlined `AppBadge pill` so it stands out on a selected row too, and its detail, naming the form by its code), and **Trace · …** (`FocusFacts` above `<LazyGraphView>`, which mounts only while its tab is open and follows the focus). A row's click moves the focus. Its row, and the rows the focus lights (a focused sale's lots, a focused lot's trades, the chain picked in the graph), look selected alike, as the timeline outlines them alike; only the focused row is marked `aria-current` (`RowStates.attributesOf`, `InstrumentRows.detectedRowStateOf`). The cells at either end of a row are padded so text keeps off a selected row's edges, and its button in the Trace column (`TraceButton`, an icon whose tooltip and label name the item) or `showTrace(node)` moves the focus and opens the Trace tab. Each table scrolls inside `InstrumentTableFrame`, which scrolls the current row (else the first selected one) into its box, between the sticky header and total, never the page. The card's children, `InstrumentHeader`, `InstrumentTimeline`, the tables, `GraphView` and `FocusFacts` (the focused item's facts and the sentences about it), take no props and read the card with `useInstrumentCard()`. The panel's list is `InstrumentPanels` (`composables/instrumentPanel/`, shapes in `types/instrumentPanel.ts`), and what the report says about an instrument and its items is `ReportInstruments` (`utils/reportInstruments.ts`: `defaultFocus`, `leftOutOf`, `warningsOf`, `chipsOf`, `splitRatioOf`); an instrument opens on its first sale on the form (`defaultFocus`), else its first dividend on the form, else its first sale or dividend from any year. The timeline's logic is `useInstrumentTimeline` with `Timelines` and `TimelineGeometry` (`composables/instrumentTimeline/`, shapes in `types/timeline.ts`). It shows the instrument's whole history, every year, the way interval data is drawn (LifeLines, Gantt): each matched lot is a bar on its own row, from the trade that opened it to the one that closed it (for a written option, the sale, then the buy), and what no lot closed is a bar that stays open to the axis's end; every other mark (corporate actions, dividends, tax, broker lots) is a point on the row under the bars. Each mark and bar is weighed (`TimelineWeight`): `REPORTED` when it became one of the form's lines (`Timelines.reachesALine`, a walk down that never enters a grouping; a lot when one of its legs did), and for a corporate action when it rebuilt such a trade or happened while a lot on the form was held; everything else is `CONTEXT` (other years' lots, open positions, broker lots FIFO doesn't use). Every sentence comes from `useProvenanceText` (drops, warnings, details, dates, split ratios). The submission guide comes from `TaxAuthorityGuides.find`. The step reads facts from node `fields` and sentences from `ProvenanceDetail` and `DropReason`, never from a node's label.

**Problems view.** `DownloadStep` calls `provideReportProblems` (`composables/useReportProblems.ts`, shapes in `types/reportProblems.ts`) for its form, and everything below reads it with `useReportProblems()`. The problems are the report step's own: `ProblemGroups.of(sections, reading.warnings, payers, walker)` (`composables/reportProblems/problemGroups.ts`) makes an instrument's warnings of one kind one `InstrumentProblem` (a key that survives the report being made again, the warnings, the items whose lines they are on (`Timelines.linesReachedBy`), how many lines, the payer defined by hand and its `ProblemState`), grouped by kind in the order the kinds first come; a payer defined by hand resolves its problem and keeps it, in the group of the kind it resolved (`DefinedPayer.resolves`), once the report no longer warns. What the report left out is listed after them by reason (`ReportInstruments.leftOutGroupsOf`, keyed `leftOutKey(index)`). Components take `definesPayer`, `leftOutKey` and the counts from `useReportProblems()`, not from the module. With anything to list, the left column has reka tabs, Instruments and Problems (its count is what is still open), and the right column shows the selected problem's `ProblemCard` instead of the instrument's card; without, the column is the instrument panel as before. `ProblemList` groups the problems under their `I18nKeys.warningGroup` heading, each row a monogram ("?" while a payer is unknown), "Payer <ISIN>", the ticker and its lines, and Unresolved or Resolved. `ProblemCard` says what went wrong (`sentenceOf`), lists what it affects with Show on the form (`showOnForm`: the Instruments tab, the instrument, its card's focus on that item), and, for `definesPayer` kinds (no company found, the lookup failed), the fix: `PayerForm` (name, street, city, a country from `/api/countries` through `useCountries()`, labelled and ordered in the reader's language), which calls the flow's `definePayer`; once defined, the payer's name and address with Edit and Remove. The header's buttons and an instrument header's "Review problem" open the tab on a problem (`review`). An open problem also shows where its instrument is: the panel row's monogram is "?" and its second line says why (`signOf`, in place of the ISIN; "defined by you" once resolved), the instrument header carries a callout with the sentence, the "On the form" table starts an affected payment with a warning icon whose tooltip is the sentence, and the timeline's affected marks carry a badge (`TimelineDrawState.flagged`) and add the sentence to their tooltip.

**Download step graph.** On the card's Trace tab, `<LazyGraphView>` (`components/download/graph/`) draws the focused item's provenance.
Its shapes are plain types in `types/provenanceGraph.ts`. The engine is stateless, in `composables/provenanceGraph/` beside
`useProvenanceGraph`, imported by path: `GraphModels.of(graph, reading, showEveryStep)` (`graphModels.ts`, with lookups such as
`GraphModels.nodeFor`) → `GraphLayouts.of(model, { focus, expanded, focusable })` →
`GraphLayouts.place(layout, GraphLayouts.defaultMetrics)` (`graphLayouts.ts`), and `GraphCaptions.of` (`graphCaptions.ts`).
The layout depends on the focus. A buy or a sale (while lots are drawn as pairs, not with every step) gets a graph of its own (`layoutTrade`): on the left everything that flowed into the trade as it is now (its rows, the trade as first recorded, the corporate actions that rebuilt it; a focus on the trade as first recorded draws the same graph), and nothing that only shares a file or an action with it; then one row per lot (`GraphLayoutNode.row`), in the order of the trade on the other side, with that trade as a stub to follow and why the lot was left out. It has no bands (`GraphLayout.banded` is false), and `GraphLayouts.place` lines each row up and centres the trade on its lots (`placeRows`). Anything else (a lot, a payment, a row) gets the stage columns and the Buys/Sells bands.
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
  (`Timelines.focusableOf(timeline)`, on the card). So the timeline always shows where the focus is.
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
- "Show every step" remaps the focus through `GraphModels.nodeFor`, so a focus on a hidden step lands on the visible node beside it.
- The layout must depend on the focus, the spread stacks and what the timeline draws alone: lighting a chain must not redraw the
  graph, because the chain holds that layout's nodes.
Every icon and tint is a literal class string in `NodeLooks` (`utils/nodeLooks.ts`; UnoCSS cannot see a built name), numbers go through
`ProvenanceFields.formatNumber`, and all text is built at render through `t()` so a language switch redraws it. A change
to the graph starts with a test in `composables/provenanceGraph/__tests__/` or `composables/__tests__/`. `GraphView` stays lazy, so the graph loads only
once the download step draws it.

The page is full width; steps 1, 2 and 3 cap their cards at `max-w-screen-md`.

Guides (broker export instructions, tax authority submission instructions) are data (`BrokerGuides`, `TaxAuthorityGuides`):
`GuideStep`s from `types/guide.ts`, shown by `GuideModal.vue` (its `trigger` slot holds the button that opens it: each broker in
step 1, the guide button in the download header), with screenshots under `packages/app/public/screenshots/` and icons under `packages/app/public/icons/`.

`pages/design/` is a design-system showcase (colours, buttons, badges, form controls). Check new shortcuts and components there.

## Using lib in components

- Build a container with `createContainer(useInfoProvider())` and `container.get(ReportPipeline)`: `read(files)` gives the
  `ImportResult`, and `generate(imported, request)` gives a report from it. Pass the `ImportResult` between steps; don't rebuild it.
- Hold lib objects (`ImportResult`, `FinancialEvents`, groupings) in `shallowRef`: they are class instances and shouldn't be made
  deeply reactive.
- Lookups go through `useInfoProvider()` (`packages/app/app/composables/useInfoProvider.ts`, a plain object implementing lib's `IInfoProvider`) → `packages/app/server/api/isin/[isin].get.ts` and `packages/app/server/api/country/[name].get.ts`,
  which run `NodeInfoProvider` on the server. `Country.treaties` is a `Map` and is sent as a plain object. A payer defined by
  hand (`defineCompany`) is answered before the server is asked. `server/api/countries.get.ts` lists the countries the lookup
  knows (`NodeInfoProvider.knownCountries()`, `{ name, code }`), for picking one by hand; `useCountries()` fetches and names them.

## Components

- `components: [{ path: "~/components", pathPrefix: false }]`: components auto-register by file name, without their folder as a prefix,
  so names must be unique across folders. Explicit `~/components/...` imports are also used.
- `components/` holds only `.vue` files, in folders by area: `upload/`, `review/`, `configure/`, `download/`, `guide/`, `form/`, `ui/`.
  Logic goes in `composables/` (state, reactivity, i18n; `provideX`/`useX` for state a whole step shares), `utils/` (stateless
  helpers several features share) and `types/` (shapes and enums several files use, one file per feature). The app has no
  classes; shapes are plain types built as object literals. Nuxt auto-imports composables and utils (top-level files only), so
  components and composables use them without import lines and their exported names must be unique.
- **Where a helper goes.** One only a component uses lives in the component (`AppButton`'s size classes). One only a composable
  uses lives, unexported, in the composable's file, and a component that needs it gets it from the composable
  (`useReportProblems().definesPayer`). A feature's bigger stateless pieces sit in a folder beside its composable
  (`composables/provenanceGraph/`, `instrumentTimeline/`, `instrumentPanel/`, `instrumentCard/`, `reportProblems/`), which Nuxt
  doesn't scan, so they are imported by path. What several features share is in `utils/`.
- **One object per module.** A `utils/` file or a composable's module exports one object named after it in the plural
  (`ProvenanceFields.of`, `I18nKeys.eventKind`, `GraphLayouts.place`), and nothing else but the types its callers need. The
  plural keeps it apart from the singular type it works on (`GraphModel` / `GraphModels`) and from a component's name
  (`GraphCaption.vue` / `GraphCaptions`), and a member doesn't repeat the object's name (`GraphModels.of`, not `graphModelOf`).
  A composable returns its object (`const { countText } = useCountText()`).
- Forms: wrap fields in `AppForm` (emits `submit` with `valid`) and use `AppTextInput`, `AppNumberInput`, `AppSelect`, `AppCheckbox`,
  `AppFileInput`. Each takes a `validate` function returning an error string or `null`, registers itself with the surrounding form, and
  links its label through `useId()`. A select with no visible label takes `ariaLabel`.
- `AppSelect`'s list is at most 20rem tall and scrolls, so a long list (the countries) stays on screen.
- The header's language switch (`ui/LanguageSwitch.vue`), right of the GitHub link, is a reka `DropdownMenu`: the current language's
  flag (`public/icons/flags/<country>.svg`, mapped from the locale code in the component), opening a radio list of every language
  by its flag and the `name` set in `nuxt.config.ts`.
- Buttons are `AppButton`: a `variant` (`ButtonVariant`: `PRIMARY`, the one filled button of a place; `SECONDARY` for the
  others; `QUIET` for a toggle, an icon or a small action inside a card) and a `size` (`ControlSize`: `MD` 40 px for forms and a
  step's main actions, `SM` 32 px inside a card, a popover or a table, `ICON` 32 px square), plus `loading` (inert, not faded) and
  `disabled`. It renders the `button-<variant>` and `control-<size>` shortcuts itself, so callers add only layout classes. A link or
  a reka trigger drawn as a button uses the shortcuts directly (`button-secondary control-md` on the CSV download).
- A problem is an `IssueButton` (`IssueSeverity`: `DANGER` for what ends up on no form, `WARNING` for a value on the form to
  check): its icon, a sentence that counts it ("1 item needs a look"), and with `opens` a chevron, as a popover's trigger. A count of
  ordinary things is a badge or plain text, never a problem's colour.
- Counted text ("2 shares", "3 items need a look", "5 postavk") goes through `useCountText().countText(CountNoun, count)`: the
  locale's plural form (`Intl.PluralRules` below a hundred, where Slovenian has one, two, few and other, and "other" from a
  hundred up, since CLDR's last-two-digits rule would write "401 postavka") picks the key from `I18nKeys.count`, each with
  `{count}`. No "(s)" in new text.
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
- Charts use chart.js; `composables/useChartTheme.ts` reads theme colours from CSS variables and sets chart.js's font to the page's, so
  a canvas writes in the same family as the page. The review step's charts use a time scale with a hand-written date adapter (`CumulativeLineChart.vue`). The download timeline (`InstrumentTimeline.vue`) needs no adapter: its x axis is a linear scale of epoch milliseconds, ticked by `TimelineGeometry.ticks` for the axis's width (labels at least 64 px apart, so a long holding steps by quarters or years), and its bars and points are drawn by an inline plugin (`TimelineMarks.plugin`, `composables/instrumentTimeline/timelineMarks.ts`, never registered globally) over one transparent scatter dataset (every point and each bar's two ends) that gives chart.js the hit-testing; chart.js's own tooltip is off, its `external` hook only reports the mark under the pointer, and the tooltip is `AppTooltip` hung on that mark through a virtual `reference`, so it looks like every other tooltip; the plugin hit-tests the rows itself (`rowAt`). The rows follow the form (`TimelineGeometry.rows`, `TimelineRowKind`): folded, each lot on the form has a row of its own, the lots closed in other years share one faint row and what is still open another (a group of one keeps its own row); a click on a folded row, or the toggle under the chart (shown when `TimelineGeometry.isFoldable`), spreads every bar onto its own row. A click on a mark or a bar moves the focus there (a lot's bar focuses its lot, what is still open the trade that opened it) and, except on the Trace tab, which follows the focus anyway, offers its trace: a small `AppPopover` hung on the clicked point through a virtual reference, saying what the item is (`describeNode`) with **View trace** (`offerTrace`, `dismissOffer`, `offered` in the card; the chart's own tooltip is off while it is open). A click on nothing lets go of the lit chain. Every bar, the triangles at its ends and every point are one size, 16 px (`TimelineGeometry.markSize`), less only where rows are packed tight, whatever the quantity or weight. A lot that is focused or lit, or that the focused trade opened or closed (`Timelines.barStateOf`), is outlined around its whole shape, the bar and the outer halves of its triangles, 2 px out from every edge (`TimelineGeometry.barOutline`, `offsetPolygon`); a point gets a ring around it. `REPORTED` bars are solid, `CONTEXT` ones faint and dotted, an open one fades out to the right. A bar's label (its quantity and how long it was held, `describeRow`) goes inside it when it fits (`TimelineGeometry.labelFits`), and is left out otherwise. Every quantity on the timeline and in the card's text is written with its unit, shares or an option's contracts, in the locale's plural form (`describeQuantity`, through `countText`), and every duration in full ("1 year, 6 months", `describeHeld`). Rows sit 34 px apart, closer past twelve rows (`TimelineGeometry.rowPitch`, `yRange`). The report's tax year is a band under the grid (`TimelineGeometry.taxYearSpan`). The canvas is not keyboard-reachable; the marks are reachable through the panel and the tables under the timeline.
- A popover inside a reka `Dialog` needs `PopoverPortal` (the dialog is translated and clips overflow); `AppPopover` portals, and
  its `z-50` sits above the dialog because it is appended to the body after it.
- Biome lints `.vue` files. Pages are exempt from the multi-word component name rule; everything else needs multi-word names.

## Text (i18n)

`@nuxtjs/i18n` with `strategy: "prefix"` (`/en/…`, `/sl/…`). Messages are flat snake_case keys in `packages/app/i18n/locales/en.json` and
`sl.json`; every key goes into both files, in Slovenian too. Use `const { t } = useI18n()` and `t("key")` in components; data files such
as the guides hold keys, not text. Page meta goes through `useSeoMeta` with translated strings. Sentences about enum values (drop reasons, detail kinds, event kinds, categories, lot-matching methods) use `Record<Enum, string>` key maps, the members of `I18nKeys` (`utils/i18nKeys.ts`), so a new enum value fails to compile until it has a key; `utils/__tests__/LocaleKeys.unit.test.ts` checks that both locale files have the same keys and that every mapped key exists. vue-i18n takes a bare `@` to start a linked message and then fails to compile the whole locale file in the browser, so a literal `@` is written `{'@'}`; the same test rejects a bare one.

## Styling

UnoCSS (`presetWind4`, `presetIcons`), configured in `packages/app/unocss.config.ts`:

- Colours are roles, never palette names or hex. `styles.css` keeps the raw palette (`--stale-150`, …) and, below it, a role block of
  `--color-*` variables; branding changes only that block. `unocss.config.ts` exposes only the roles, so a palette class such as
  `bg-stale-100` compiles to nothing, silently. Neutral roles: `page`, `surface`, `surface-raised`, `surface-hover`, `surface-inverse`,
  `ink`, `ink-muted`, `ink-inverse`, `edge`, `edge-strong`, `edge-subtle`, `overlay`. Each `ColorIntent` (`app/types/ui.ts`:
  action, accent, neutral, success, warning, danger, info) has `<intent>`, `-hover` (a step lighter), `-pressed` (a step darker), `-on`
  (text on the fill), `-soft` with `-soft-hover` and `-soft-pressed`, `-ink` and `-edge`: `bg-accent text-accent-on`, `border-danger-edge`.
- Class names are written out in full: UnoCSS only sees literals, so `` `bg-${color}` `` renders nothing. An intent's classes
  come from `IntentClasses` (`soft`, `solid`, `edge`), which `AppBadge`,
  `AppCallout`, `InstrumentMonogram`, `NodeLooks` and the rest read; don't write another `Record<ColorIntent, string>`.
- UnoCSS scans `.vue` files and, through `content.pipeline.include` in `unocss.config.ts`, the TypeScript in `app/utils/` and
  `app/composables/`. A class or icon written only in a `.ts` file anywhere else is never generated.
- Every control family has the same states: hover a step lighter, pressed (`active:`) a step darker, open (`aria-expanded`) as
  hovered, pressed in (`aria-pressed`) and selected in the accent, keyboard focus `app-focus-ring` (`app-focus-ring-inset` in a row
  or a tab, whose list clips), disabled half faded and inert. The shortcuts carry them: `control` with `control-md`/`-sm`/`-icon`,
  `button-primary`/`-secondary`/`-quiet`, `button-issue-danger`/`-warning`, `field` (what you type into shows its focus on any
  focus) with `field-invalid`, `checkbox` with `checkbox-invalid`, `menu-box`/`menu-item` for a dropdown, and for a list's rows
  `row-selectable` and `row-selected` (square, the accent tint and a bar on the left, kept under the pointer; `RowStates.attributesOf`
  gives a table row's). A new interactive thing takes one of these, not hand-written hover classes. `pages/design/` shows each
  family in each state.
- Type has five roles, one family: `text-heading` (18 semibold: a step's or an instrument's title), `text-subheading` (14 semibold:
  a group), `text-label` (14 medium: a field, a column header, a small button), `text-body` (14: sentences, cells) and `text-meta`
  (12 muted: identifiers, dates under a name, captions); text is ink unless a class says otherwise (`app-container`). No capitals or
  letter spacing for labels, sentence case in both languages, identifiers (ISINs, file names, option symbols) in the body font,
  `tabular-nums` where numbers line up. The landing page's headline and the printer's "brrr" are display type of their own.
- Prefer the shortcuts: `app-text`, `app-text-muted`, `app-border`, `app-surface-raised`, `app-surface-sunken`, `card`, `card-padding-md`,
  the type roles, the controls above, `text-error`, `alert-error`, `tooltip-box`, `logo-tile` (the light tile every broker and tax office logo sits on, since logos are made for a light page; size the
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
  with the report flow's pages, and the landing page loads neither (see "The landing page"; its printer prefetches the flow only
  when pointed at or focused). Inside the flow, `ReviewStep` uses `<LazyInstrumentModal>` (charts and the row popover) and
  the download step `<LazyGraphView>`; make the next heavy part lazy the same way rather than raising the limit.
- `@nuxtjs/seo` prerenders the sitemap and OG images (`zeroRuntime`), so the server bundle holds only the lookup routes.
- The root `Dockerfile` builds lib, then the app, and runs `.output/server/index.mjs`. Publishing a GitHub release force-pushes `master`
  to the `website` branch (`.github/workflows/sync-website-branch.yml`).
