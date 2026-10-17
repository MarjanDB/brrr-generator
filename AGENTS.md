# BRRR Generator — Agent Guidelines

## Project overview

Generates tax authority import forms from broker export files. Today that means Interactive Brokers Flex Query XML in, Slovenian eDavki
forms out: **DOH_KDVP** (shares), **DOH_DIV** (dividends) and **D_IFI** (derivatives), each as the XML eDavki imports plus a CSV for
checking it. The site runs at https://taxesgobrrr.com.

pnpm workspace with three packages:

- **`lib/`** (`@brrr/lib`) — the tax engine: broker parsing, lot matching, report generation. Platform-neutral, because the site runs it
  in the browser.
- **`app/`** (`@brrr/app`) — Nuxt 4 site. Reports are generated client-side; the server only answers company and country lookups
  (`app/server/api/`).
- **`standalone/cli/`** (`@brrr/cli`) — reads `imports/*.xml` and `config/userConfig.yml`, writes reports to `exports/`.

`imports/`, `exports/` and `config/` hold personal financial data and are gitignored (except `config/userConfig.example.yml`). Never commit
anything from them.

## Package manager

pnpm 11, pinned in the root `package.json` (`packageManager`). Always use `pnpm`.

| Command                                        | What it does                                           |
| ---------------------------------------------- | ------------------------------------------------------ |
| `pnpm lint` / `pnpm lint:fix`                  | Biome check / check and fix, whole repo                |
| `pnpm --filter @brrr/lib test`                 | Vitest, lib                                            |
| `pnpm --filter @brrr/lib typecheck`            | `tsc --noEmit`, lib                                    |
| `pnpm --filter @brrr/lib build`                | tsdown, lib → `lib/dist/`                              |
| `pnpm --filter @brrr/app typecheck`            | `nuxt typecheck`                                       |
| `pnpm --filter @brrr/app build`                | Nuxt build                                             |
| `pnpm --filter @brrr/cli exec tsc --noEmit`    | Typecheck the CLI                                      |
| `pnpm dev`                                     | Nuxt dev server                                        |
| `pnpm cli --year 2025 [--report kdvp,div,ifi]` | Generate reports from `imports/` (calls Yahoo Finance) |

**The app and the CLI import `@brrr/lib` from `lib/dist/`.** After changing `lib/`, run `pnpm --filter @brrr/lib build` before
typechecking or running either of them, or they keep seeing the old code.

Dependency versions live in the `catalog:` of `pnpm-workspace.yaml`, pinned exactly. Read the **bumping-dependencies** skill before adding,
removing or updating any dependency.

## Checks

Run these for what you touched before calling a change done, and report failures with their output:

- Anything: `pnpm lint:fix`
- `lib/`: `pnpm --filter @brrr/lib test` and `pnpm --filter @brrr/lib typecheck`
- `app/`: build lib, then `pnpm --filter @brrr/app typecheck`
- `standalone/cli/`: build lib, then `pnpm --filter @brrr/cli exec tsc --noEmit`

## Architecture

imports → broker provider (extract + transform) → **StagingFinancialEvents** → **StagingFinancialGroupingProcessor** →
**FinancialEvents** → tax authority provider (applies identifier relationships, lot matching, report generation) → XML + CSV

- `lib/src/Brokerages/` — one folder per broker; turns export files into broker-neutral staging events.
- `lib/src/Core/` — broker- and country-neutral: schemas, staging → core processing, lot matching (NONE / FIFO / PROVIDED).
- `lib/src/TaxAuthorities/` — one folder per country; turns core events into that country's forms.
- `lib/src/InfoProviders/` — company and country lookups (`InfoProvider`); the Node implementation and its JSON data sit in `Node/`.

The **pipeline-and-structure** skill has the details and the steps for adding a broker, tax authority or report type.

## Code conventions

### TypeScript

- PascalCase for types, classes, enums, Vue components and `lib/src/` folders; camelCase for functions, methods and variables.
- Imports go at the top of the file. Inside `lib/` import through the `@brrr/*` alias (`@brrr/Core/Schemas/Events`), not relative paths.
- Domain models are classes with `public readonly` fields, one args-object constructor and a `copy(overrides)` that returns a new
  instance (see `Core/Schemas/`). Don't mutate them.
- Data from outside (XML rows, config files, env) is parsed with zod 4 (`import { z } from "zod/v4"`): a const holding `{ Schema }` and a
  same-named type `z.output<typeof X.Schema>` (see `Brokerages/Ibkr/Schemas/IbkrSchemas.ts`).
- `type` for plain data shapes. `interface` only for contracts a class implements (`IBrokerageProvider`, `ITaxAuthorityProvider`,
  `InfoProvider`).
- `enum` for fixed sets of values, not string-literal unions or `as const` objects.
- Identifiers in new code (ISINs, transaction IDs, report type IDs, …) get a nominal type, `Nominal<string, "Isin">` from
  `@brrr/Utils/NominalType`, rather than a bare `string`.
- Dates and times use luxon. Models hold `ValidDateTime` (`DateTime<true>`); parse input with `zDateTimeFromISOString`
  (`@brrr/Utils/DateTime`). No `Date`.
- Dependency injection is Inversify without decorators: each area has a `*Module.ts` that binds classes with
  `toResolvedValue(factory, [dependencies])` in singleton scope, and `createContainer(infoProvider)` in `lib/src/container.ts` loads them
  all. Anything the app or CLI needs is exported from `lib/src/index.ts`.
- `lib/` stays platform-neutral: no DOM, and no Node built-ins (`fs`, `Buffer`, …) outside `InfoProviders/Node/`, which is exported
  separately as `@brrr/lib/info/node`. Dependencies used by the report code need a browser build (e.g. `csv-stringify/browser/esm/sync`);
  `CsvWithoutNodeBuffer.test.ts` guards the CSV generators.
- Biome formats and lints everything, `.vue` included: tabs, line width 100.

### App

Read the **web-app** skill before changing `app/`. Every user-facing string goes through i18n and needs both `en.json` and `sl.json`.

### Tests

Vitest with globals (`describe`, `it`, `expect`, `vi` need no import). Tests sit in `__tests__/` next to the code they cover, as
`*.test.ts`; XML fixtures go in `__tests__/Cases/`. A change in behaviour gets a test that fails before it and passes after.

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
