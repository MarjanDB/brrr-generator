# BRRR Generator — Agent Guidelines

## Project overview

Generates tax authority import forms from broker export files. Today that means Interactive Brokers Flex Query XML in, Slovenian eDavki
forms out: **DOH_KDVP** (shares), **DOH_DIV** (dividends) and **D_IFI** (derivatives), each as the XML eDavki imports plus a CSV for
checking it. The site runs at https://taxesgobrrr.com.

pnpm workspace with four packages, all under `packages/`:

- **`packages/lib/`** (`@brrr/lib`) — the tax engine: broker parsing, lot matching, report generation. Platform-neutral, because the site runs it
  in the browser.
- **`packages/app/`** (`@brrr/app`) — Nuxt 4 site. Reports are generated client-side; the server only answers company and country lookups
  (`packages/app/server/api/`).
- **`packages/cli/`** (`@brrr/cli`) — reads `imports/*.xml` and `config/userConfig.yml`, writes reports to `exports/`.
- **`packages/test-cases/`** (`@brrr/test-cases`) — the test cases: anonymised broker exports and the tax authority files expected from them.
  Data and file access only; lib's tests consume it (see Tests).

`imports/`, `exports/` and `config/` hold personal financial data and are gitignored (except `config/userConfig.example.yml`). Never commit
anything from them.

## Package manager

pnpm 11, pinned in the root `package.json` (`packageManager`). Always use `pnpm`.

| Command                                        | What it does                                           |
| ---------------------------------------------- | ------------------------------------------------------ |
| `pnpm lint` / `pnpm lint:fix`                  | Biome check / check and fix, whole repo                |
| `pnpm --filter @brrr/lib test`                 | Vitest, lib (unit, integration and acceptance tests)   |
| `pnpm --filter @brrr/lib typecheck`            | `tsc --noEmit`, lib                                    |
| `pnpm --filter @brrr/lib build`                | tsdown, lib → `packages/lib/dist/`                     |
| `pnpm --filter @brrr/app typecheck`            | `nuxt typecheck`                                       |
| `pnpm --filter @brrr/app build`                | Nuxt build                                             |
| `pnpm --filter @brrr/cli exec tsc --noEmit`    | Typecheck the CLI                                      |
| `pnpm --filter @brrr/test-cases typecheck`     | Typecheck the test cases package                       |
| `pnpm dev`                                     | Nuxt dev server                                        |
| `pnpm cli --year 2025 [--report kdvp,div,ifi]` | Generate reports from `imports/` (calls Yahoo Finance) |

**The app and the CLI import `@brrr/lib` from `packages/lib/dist/`.** After changing `packages/lib/`, run `pnpm --filter @brrr/lib build` before
typechecking or running either of them, or they keep seeing the old code.

Dependency versions live in the `catalog:` of `pnpm-workspace.yaml`, pinned exactly. Read the **bumping-dependencies** skill before adding,
removing or updating any dependency.

## Checks

Run these for what you touched before calling a change done, and report failures with their output:

- Anything: `pnpm lint:fix`
- `packages/lib/`: `pnpm --filter @brrr/lib test` and `pnpm --filter @brrr/lib typecheck`
- `packages/app/`: build lib, then `pnpm --filter @brrr/app typecheck`
- `packages/cli/`: build lib, then `pnpm --filter @brrr/cli exec tsc --noEmit`
- `packages/test-cases/`: `pnpm --filter @brrr/test-cases typecheck` and `pnpm --filter @brrr/lib test`

## Architecture

imports → broker provider (extract + transform) → **StagingFinancialEvents** → **StagingFinancialGroupingProcessor** →
**FinancialEvents** → tax authority provider (applies identifier relationships, lot matching, report generation) → XML + CSV

- `packages/lib/src/Brokers/` — one folder per broker; turns export files into broker-neutral staging events.
- `packages/lib/src/Core/` — broker- and country-neutral: schemas, staging → core processing, lot matching (NONE / FIFO / PROVIDED).
- `packages/lib/src/TaxAuthorities/` — one folder per country; turns core events into that country's forms.
- `packages/lib/src/InfoProviders/` — company and country lookups (`InfoProvider`); the Node implementation and its JSON data sit in `Node/`.

The **pipeline-and-structure** skill has the details and the steps for adding a broker, tax authority or report type.

## Code conventions

### TypeScript

- PascalCase for types, classes, enums, Vue components and `packages/lib/src/` folders; camelCase for functions, methods and variables.
- Imports go at the top of the file. Inside `packages/lib/` import through the `@brrr/*` alias (`@brrr/Core/Schemas/Events`), not relative paths.
- Domain models are classes with `public readonly` fields and one args-object constructor (see `Core/Schemas/`). Don't mutate them, and
  don't copy one just to change a field: build each value once with its final contents. Where a value really changes (a split rescaling
  a trade), one named function builds the new object through the class's constructor and appends a `provenance` step, so the trace back
  to the original survives (see `scaleTradeForSplit` in `Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts`).
- Data from outside (XML rows, config files, env) is parsed with zod 4 (`import { z } from "zod/v4"`): a const holding `{ Schema }` and a
  same-named type `z.output<typeof X.Schema>` (see `Brokers/Ibkr/Schemas/IbkrSchemas.ts`).
- `type` for plain data shapes. `interface` only for contracts a class implements (`IBrokerProvider`, `ITaxAuthorityProvider`,
  `InfoProvider`).
- `enum` for fixed sets of values, not string-literal unions or `as const` objects.
- Identifiers (ISINs, transaction IDs, report type IDs, …) get a nominal type from `@brrr/Utils/NominalType`, never a bare `string`.
  Each domain owns its own, even for the same concept: IBKR's in `Brokers/Ibkr/Schemas/IbkrIdentifiers.ts`, core's (staging and
  the lookups included) in `Core/Schemas/Identifiers.ts`, eDavki's in `TaxAuthorities/Slovenia/Schemas/EDavkiIdentifiers.ts`, the
  registries' in `TaxAuthorities/TaxAuthorityIdentifiers.ts` and `Brokers/BrokerIdentifiers.ts` (enums where the set is fixed).
  A value changes type only where it crosses into the next domain. Declare the type, then a same-named const whose `Schema` holds
  the one cast; the brand names the domain:

  ```ts
  export type Isin = Nominal<string, "Core.Isin">;
  export const Isin = {
  	Schema: z.string().transform((value) => value as Isin),
  };
  ```

  A type built from another domain's adds a `From<X>` helper that goes through its `Schema` (`EDavkiIsin.FromIsin`), where its
  domain may depend on the other. Core can't know brokers, so `Transform.ts` turns IBKR values into core ones with the core type's
  `Schema`. Tests build ids the same way: `Isin.Schema.parse("US0378331005")`.
  Lib's exports never make a caller (the site, the CLI) create one: `index.ts` exports enums but no nominal types, and the
  public entry points (`TaxAuthorityRegistry.generateExports`, `PredefinedInfoProvider`, `NodeInfoProvider`) take plain strings
  and build the ids inside lib.
- Dates and times use luxon. Models hold `ValidDateTime` (`DateTime<true>`); parse input with `zDateTimeFromISOString`
  (`@brrr/Utils/DateTime`). No `Date`.
- Dependency injection is Inversify without decorators: each area has a `*Module.ts` that binds classes with
  `toResolvedValue(factory, [dependencies])` in singleton scope, and `createContainer(infoProvider)` in `packages/lib/src/container.ts` loads them
  all. Anything the app or CLI needs is exported from `packages/lib/src/index.ts`.
- `packages/lib/` stays platform-neutral: no DOM, and no Node built-ins (`fs`, `Buffer`, …) outside `InfoProviders/Node/`, which is exported
  separately as `@brrr/lib/info/node`. Dependencies used by the report code need a browser build (e.g. `csv-stringify/browser/esm/sync`);
  `CsvWithoutNodeBuffer.unit.test.ts` guards the CSV generators.
- Biome formats and lints everything, `.vue` included: tabs, line width 100.

### Naming

Where a name comes from depends on the layer it sits in. We only take the industry's name when our own would mislead.

- **Brokers and tax authorities use their source's names and codes.** `Brokers/Ibkr/` mirrors the Flex Query
  (`AssetClass.STOCK = "STK"`), and `TaxAuthorities/Slovenia/` mirrors eDavki (`EDavkiTradeReportGainType`, `"PLVP"`), because
  those values are read from or written to someone else's file.
- **Core uses our own words, chosen to read well.** Industry codes don't become Core names or values (`SPLIT`, not `SPLF`).
  Where a Core enum has an industry counterpart, a comment above it names the standard and each member gives its code:

  ```ts
  // ISO 15022/20022 corporate action event codes (CAEV).
  export enum IdentifierChangeType {
  	RENAME = "RENAME", // CHAN
  	SPLIT = "SPLIT", // SPLF
  	REVERSE_SPLIT = "REVERSE_SPLIT", // SPLR
  }
  ```

- **Values another body assigns keep that body's code.** We store the standard's code for ISINs (ISO 6166), currencies
  (ISO 4217), countries (ISO 3166-1 alpha-2) and exchanges (ISO 10383 MIC), and keep no list of our own.
- **An industry term keeps its industry meaning.** We can coin words, but a term with an established meaning in finance
  ("underlying", "leg", "position", "proceeds") either means exactly that or isn't used.
- **Core is country-neutral, values included.** A country's codes (eDavki's acquisition methods, ZDoh-2 dividend types) live
  under that country's tax authority, which maps Core values to them.
- **One name per concept.** A staging class and its core twin differ only by the `Staging` prefix, and each word is spelled one
  way across the code (`taxpayer`, `EDavki`).

Some older Core names predate these rules. They're being brought in line separately, so don't rename them in passing.

### App

Read the **web-app** skill before changing `packages/app/`. Every user-facing string goes through i18n and needs both `en.json` and `sl.json`.

### Tests

Vitest with globals (`describe`, `it`, `expect`, `vi` need no import). Tests sit in `__tests__/` next to the code they cover. A change in
behaviour gets a test that fails before it and passes after.

Every test file names its kind:

| Suffix                 | What it tests                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `.unit.test.ts`        | One class or function, with at most its own small collaborators                        |
| `.integration.test.ts` | Several lib classes wired together: the container, or a provider with its generators   |
| `.acceptance.test.ts`  | An input reached the tax authority correctly: the form it gets equals the expected one |

To run one kind: `pnpm --filter @brrr/lib exec vitest run acceptance.test`.

- **Test cases** live in `packages/test-cases/cases/<Broker>/<Case>/`: broker exports in `input/`, the files they should produce in
  `expected/<authority>/<report>[-<lotMatching>].{xml,csv}` (DIV ignores lot matching, so its files carry no suffix). A case covers
  one year. Each case is declared once in the registry `TestKit` (`packages/test-cases/index.ts`, the package's only export): its `year`,
  its named `inputs` and its named `expected` reports. Tests reach them as typed properties, never path strings:
  `stockTrade.year`, `stockTrade.inputs.simpleStockTrade.read()`, `stockTrade.readInputs()`,
  `stockTrade.expected.slovenia.kdvpFifo.xmlPath`. On import the registry fails if a case's declared files and its folder differ,
  so adding a file means declaring it. Every broker export a test reads lives here, unit tests included. Exports are trimmed and
  anonymised (fake account IDs); never copy anything from `imports/`.
- **Acceptance tests** are about the tax authority: did this input reach it correctly? They sit with the authority, one file per
  form (`packages/lib/src/TaxAuthorities/Slovenia/__tests__/Acceptance/{Kdvp,Ifi,Div}.acceptance.test.ts`), with one self-contained test
  per input case, titled by what the authority must see. Each runs the case through the public `Scenario.pipeline` only, and
  judges only the generated form: its own `await expect(report.xml).toMatchFileSnapshot(...)` and CSV lines. No calls into lib's
  internals. Expected files pin the output byte for byte: `vitest run acceptance.test -u` rewrites them, so only update them for
  an intended change, and read the diff. CI never writes them.
- **Write tests out line by line.** A reader should see what is checked without working anything out: one `expect` per value
  (`expect(events[0].quantity).toEqual(10)`), each test's data written in the test or right above it, and no loops, `test.each`,
  helper assertions or `map`/`filter` chains that compute the expectations.
- **`Scenario`** (`packages/lib/src/__tests__/support/Scenario.ts`) builds lib's objects and runs the pipeline, and it **invents no values**:
  - `Scenario.build.*` (events, lots, groupings, their `staging` twins, `ibkr.segmentedTrades`) fixes only what a builder's name
    says. `stockBought` is a STOCK bought with multiplier 1, `optionSold` an OPTION sold, and everything built has no provenance yet.
    Every other value (id, date, quantity, price, currency, commission, tax, fx rate, lot quantity, long/short, every grouping
    list, even an empty one) is required, so the test shows the exact scenario.
  - `Scenario.config.report(year, lotMatching)` and `.infoProvider(lookups)`.
  - `Scenario.pipeline.run(files)` and `.generate(events, { report, year, lotMatching, taxPayer, info })`, all arguments required.
- **`Fixtures`** (`packages/lib/src/__tests__/support/Fixtures.ts`) holds named test data that tests look up on purpose: `taxPayer` (the
  one the expected files were generated for), `lookups` (company and country data), and IBKR sample rows (`ibkr.stockTradeBuy`, …).
  A test that needs a variant spreads a fixture and lists what it changes.
- Call `Scenario` and `Fixtures` directly: no local wrapper functions around them, and every buy, sale and lot built with its exact
  type. A local helper is only for wiring that isn't test data, such as a provider built with collaborators the test spies on.
  `support/Setup.ts` pins Luxon's zone and clock for every test.
- **A test case or a unit test?** A case for a real-shaped export turned into whole reports: regressions from users' exports and
  anything that crosses layers. A unit test with `Scenario` for one rule in one class, where hand-built input states the rule more
  clearly than an export.

## Skills

Project skills live in `.claude/skills/`:

- **pipeline-and-structure** — where code goes; adding a broker, tax authority or report type.
- **ibkr-flex-query** — the IBKR Flex Query XML, its schemas and fixtures.
- **slovenian-tax-edavki** — eDavki forms, taxpayer fields, XSDs, Slovenian report rules.
- **infoproviders-lookup-data** — company/country/treaty lookups and their JSON fallbacks.
- **web-app** — the Nuxt wizard, components, i18n, styling, server routes.
- **bumping-dependencies** — the pnpm catalog and supply-chain rules.

The docs under `resources/docs/` predate the TypeScript rewrite (they describe notebooks and the Python layout). Trust the code and the
skills over them.

# Core Behavior Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Investigate Before Editing

**For any bug or non-trivial change, diagnose before touching code.**

Before making any edits, investigate the issue and respond with:
1. The exact root cause with `file:line` references.
2. Two alternative fix locations, and which is better and why.
3. Any state I should log to confirm the hypothesis.

Then wait for my go-ahead before editing. Do not jump to a plausible-but-wrong root cause and burn iterations.

## 6. Restate Requests as a Checklist

**For multi-part requests, enumerate before implementing and verify after.**

Before starting, restate the request as a numbered checklist of discrete deliverables.

After implementation, walk through each item and confirm coverage with `file:line` evidence. Do not declare done until every checklist item has been verified this way.
