## Goal

This is a TypeScript project (running on Deno) for generating tax reports given activity statements from a stock broker.

## Context

The project uses Deno for runtime and tooling. Entrypoints are Deno Jupyter notebooks in the `notebooks/` directory and a Nuxt 3 web app in
`app/`. We use PascalCase for types and classes; methods and functions use camelCase. Module system: ES modules with explicit `.ts` imports.
No dependency injection framework — use constructor injection or plain factory functions. Imports are only allowed at the top of the file.
Project configuration is in `deno.json` (workspace config + tasks).

### Type conventions

- **`type`** for data structures (records, unions, domain objects). This is the default — use it for anything that was a Python
  `@dataclass`.
- **`class`** for stateful objects with methods and encapsulated logic (e.g. `FinancialIdentifier`, processors, providers).
- **`interface`** only for OOP contracts (abstract method signatures that classes must implement). Do not use `interface` for plain data
  shapes.
- **`enum`** for named constant sets. This is the TypeScript equivalent of Python `class Foo(Enum)`. Prefer `enum` over `as const` objects
  or string union types for values that were Python enums.
- **`luxon`** for all date/time operations (`DateTime`, `Duration`). Do not use `Date`, `Temporal`, or `date-fns`.

## Design

The project is structured as a monorepo workspace with a core `lib/` library, Deno Jupyter notebooks, and a client-side Nuxt web app.
General architecture of the project consists of:

- Importing and parsing broker activity statements,
- converting them into a broker-neutral format known by this project,
- processing and annotating with company-relevant information,
- and passing the result to tax authority implementations that define lot matching and other country-specific rules.

### Pipeline and data flow

1. **Input:** Broker activity XML files in `imports/`. Currently only **IBKR Flex Query** XML is supported.
2. **Broker layer:** A brokerage provider (e.g. `IbkrBrokerageExportProvider`) discovers files, loads each into **CommonBrokerageEvents**
   (broker-specific; for IBKR this is `SegmentedTrades`), merges them, then transforms to **StagingFinancialEvents** (groupings—one per
   financial identifier—and identifier relationship partials). Staging identifiers use **strict equality** (exact match on ISIN, Ticker,
   Name), so related instruments (e.g. after an ISIN change) remain in separate groupings; relationship logic handles "same company" later.
3. **Staging → core:** **StagingFinancialGroupingProcessor** takes **StagingFinancialEvents** (groupings + staging relationships), resolves
   partial relationships, and returns **FinancialEvents** (core **FinancialGrouping**s plus core **IdentifierRelationships**). Each
   StagingFinancialGrouping becomes a **FinancialGrouping** (processed events and lot-matched lots).
4. **Output:** A **TaxAuthorityProvider** accepts **FinancialEvents** (groupings + identifier relationships) and report configuration. The
   provider applies identifier relationships (e.g. RENAME via **ApplyIdentifierRelationshipsService**) internally, then produces XML (and
   optionally CSV) in `exports/`. Lot matching runs on the applied groupings.

Flow: **imports → broker Extract/Transform → StagingFinancialEvents → StagingFinancialGroupingProcessor → FinancialEvents →
TaxAuthorityProvider (applies relationships, then generates report) → exports.**

### Key types and layers

- **CommonBrokerageEvents** – Broker-specific container: cash transactions, corporate actions, stock trades/lots, derivative trades/lots.
  Each broker uses its own concrete type (e.g. IBKR: `SegmentedTrades`).
- **StagingFinancialGrouping** – Broker-agnostic staging model per financial identifier (staging events and lots). Output of broker
  Transform; input to StagingFinancialGroupingProcessor.
- **FinancialEvents** – Core container: `groupings` (array of **FinancialGrouping**) and `identifierRelationships`. Output of
  StagingFinancialGroupingProcessor; input to ApplyIdentifierRelationshipsService.
- **FinancialGrouping** – Core domain model (processed events, lot-matched lots). Tax authority providers receive **FinancialEvents** and
  apply identifier relationships to obtain groupings for report generation.
- **IdentifierRelationship** – Directed, typed relationship between financial identifiers (e.g. `fromIdentifier` changed to `toIdentifier`;
  types: `RENAME`, `SPLIT`, `REVERSE_SPLIT`). Carried in FinancialEvents; the tax authority provider uses
  **ApplyIdentifierRelationshipsService** to bake selected types (e.g. RENAME) into merged groupings before generating reports.
- **Staging** = raw broker-agnostic representation; **Core FinancialEvents** = processed, lot-matched representation used for tax report
  generation.

### Directory and config conventions

- **`lib/`** – Core reusable library. Must have zero DOM dependencies and no Deno-specific APIs (to enable use from the Nuxt client-side
  app).
- **`notebooks/`** – Deno Jupyter notebook entry points (`.ipynb` with Deno TypeScript kernel).
- **`app/`** – Nuxt 3 web app (client-side only). Thin wrappers around `lib/`.
- **`imports/`** – Broker export XML files (e.g. Flex Query). Gitignored. Notebooks read from here.
- **`exports/`** – Generated tax reports (XML and CSV). Gitignored.
- **`config/`** – Gitignored; must contain **`userConfig`** (format defined by tax authority). No sample file is committed.
- **`deno.json`** – Workspace configuration and task definitions (`deno task`).

### Notebooks

All notebooks share the same pattern: load broker exports from `imports/`, merge, transform to broker-agnostic format, run
**StagingFinancialGroupingProcessor** (get **FinancialEvents**), then pass **FinancialEvents** to the tax authority provider for a specific
report type and date range. The provider applies identifier relationships (e.g. RENAME) internally. Only the report type and configuration
(e.g. lot matching, date range) differ per notebook.

- **dividends** – Dividend report; typically uses NONE for lot matching.
- **stock trades** – Security/share report; typically uses FIFO.
- **derivative trades** – Derivatives report; typically uses FIFO.

### Lot matching

Report configuration supports **NONE**, **FIFO**, and **PROVIDED** lot matching methods. Which method is used depends on the report type and
tax authority rules.

### "Failed processing stock lot"

These messages come from **StagingFinancialGroupingProcessor** when a stock lot cannot be matched to trades (e.g. missing or invalid
ISIN/ticker). Fixes often involve **InfoProviders** lookup data: `lib/infoProviders/missingISINLookup.json`, `missingCompaniesLookup.json`,
or the company/ISIN resolution used in the staging→core pipeline.

### Dependency injection and entrypoints

There is no DI framework. Dependencies are wired via constructor injection or factory functions. Notebooks instantiate the broker provider
and config by hand, then use **StagingFinancialGroupingProcessor** and the tax authority provider with explicit dependencies. The Nuxt app
does the same through utility wrappers in `app/utils/`.

### Testing and tooling

- **Tests:** `deno test` (built-in). Test files match `*.test.ts`. Tests live next to code in **`Tests/`** directories (e.g.
  `lib/brokerages/ibkr/Tests/`, `lib/taxAuthorities/slovenia/Tests/`, `lib/core/.../Tests/`) and often use XML or other fixtures.
- **Tasks:** `deno task test`, `deno task fmt`, `deno task lint`, `deno task type-check`.
- **`deno.json`:** TypeScript strict mode enabled. `deno fmt` for formatting; `deno lint` for linting. No external format/lint tools needed.

### Adding new behaviour

- **New report type** – Implement or extend the tax authority provider and its report generation (XML/CSV) for that report.
- **New broker** – Add a provider under `lib/brokerages/` implementing **CommonBrokerageExportProvider** (see
  `resources/docs/brokerage-development/translations/README.en.md`).
- **New tax authority (country)** – Add a provider under `lib/taxAuthorities/` implementing the abstract TaxAuthorityProvider interface.

### Docs

- **Usage:** `resources/docs/usage-examples/translations/README.en.md`
- **Broker implementation:** `resources/docs/brokerage-development/translations/README.en.md`
- **Architecture:** `ARCHITECTURE.md`
- **Migration from Python:** `MIGRATION.md`
