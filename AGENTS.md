## Goal

This is a Python project for generating tax reports given activity statements from a stock broker.

## Context

The project uses pipenv for virtual python environments.
Entrypoints are notebooks in the `notebooks/` directory.
We are using PascalCase.

## Design

The project is structured using a modules directory structure and uses opyoid for dependency injection.
General architecture of the project consists of:

- Importing and parsing broker activity statements,
- converting them into a broker-neutral format known by this project,
- processing and annotating with company-relevant information,
- and passing the result to tax authority implementations that define lot matching and other country-specific rules.

### Pipeline and data flow

1. **Input:** Broker activity XML files in `imports/`. Currently only **IBKR Flex Query** XML is supported.
2. **Broker layer:** A brokerage provider (e.g. `IbkrBrokerageExportProvider`) discovers files, loads each into **CommonBrokerageEvents** (broker-specific; for IBKR this is `SegmentedTrades`), merges them, then transforms to a sequence of **StagingFinancialGrouping** (one per financial identifier / instrument). Staging identifiers use **strict equality** (exact match on ISIN, Ticker, Name), so related instruments (e.g. after an ISIN change) remain in separate groupings; relationship logic handles “same company” later.
3. **Staging → core:** **StagingFinancialGroupingProcessor** converts each StagingFinancialGrouping into **FinancialGrouping** (core domain model with processed events and lot-matched lots).
4. **Identifier relationship step:** **IdentifierRelationshipService** takes `Sequence[FinancialGrouping]` and returns (groupings, **IdentifierRelationships**); used so report generation can later merge by company. Relationships are directed and typed (e.g. RENAME, SPLIT, REVERSE_SPLIT).
5. **Output:** A **TaxAuthorityProvider** takes `Sequence[FinancialGrouping]` plus report configuration and produces XML (and optionally CSV) in `exports/`.

Flow: **imports → broker Extract/Transform → StagingFinancialGrouping → StagingFinancialGroupingProcessor → FinancialGrouping → IdentifierRelationshipService → (groupings, IdentifierRelationships) → TaxAuthorityProvider → exports.**

### Key types and layers

- **CommonBrokerageEvents** – Broker-specific container: cash transactions, corporate actions, stock trades/lots, derivative trades/lots. Each broker uses its own concrete type (e.g. IBKR: `SegmentedTrades`).
- **StagingFinancialGrouping** – Broker-agnostic staging model per financial identifier (staging events and lots). Output of broker Transform; input to StagingFinancialGroupingProcessor.
- **FinancialGrouping** – Core domain model (processed events, lot-matched lots). Output of StagingFinancialGroupingProcessor; input to TaxAuthorityProvider and IdentifierRelationshipService.
- **IdentifierRelationships** – Directed, typed relationships between financial identifiers (e.g. FromIdentifier changed to ToIdentifier; types: RENAME, SPLIT, REVERSE_SPLIT). Output of IdentifierRelationshipService; for future use when reports merge by company.
- **Staging** = raw broker-agnostic representation; **Core FinancialEvents** = processed, lot-matched representation used for tax report generation.

### Directory and config conventions

- **`imports/`** – Broker export XML files (e.g. Flex Query). Notebooks read from here.
- **`exports/`** – Generated tax reports (XML and CSV).
- **`config/`** – Gitignored; must contain **`userConfig.yml`**. Structure is defined by the tax authority and `ConfigurationProvider` (e.g. taxpayer identity, address, dates). No sample file is committed.

### Notebooks

All three notebooks share the same pattern: load broker exports from `imports/`, merge, transform to broker-agnostic format, run **StagingFinancialGroupingProcessor**, run **IdentifierRelationshipService** (groupings, relationships), then call the tax authority provider for a specific report type and date range. Only the report type and configuration (e.g. lot matching, date range) differ per notebook.

- **dividends** – Dividend report; typically uses NONE for lot matching.
- **stock trades** – Security/share report; typically uses FIFO.
- **derivative trades** – Derivatives report; typically uses FIFO.

### Lot matching

Report configuration supports **NONE**, **FIFO**, and **PROVIDED** (`TaxAuthorityLotMatchingMethod` in `TaxAuthorityProvider.Schemas.Configuration`). Which method is used depends on the report type and tax authority rules.

### "Failed processing stock lot"

These messages come from **StagingFinancialGroupingProcessor** when a stock lot cannot be matched to trades (e.g. missing or invalid ISIN/ticker). Fixes often involve **InfoProviders** lookup data: `src/InfoProviders/missingISINLookup.json`, `missingCompaniesLookup.json`, or the company/ISIN resolution used in the staging→core pipeline.

### Dependency injection and entrypoints

**AppModule** (`src/AppModule.py`) installs: FinancialEventsModule, InfoProviderModule, BrokerageExportProvidersModule, ConfigurationModule, LotMatchingModule, StagingFinancialEventsModule. Notebooks do not use the injector directly; they instantiate the broker and config by hand, then use **StagingFinancialGroupingProcessor** and the tax authority provider with explicit dependencies.

### Testing and tooling

- **Tests:** `pytest`, with `pythonpath = ["src"]`. Test files/classes/functions match `Test*.py`, `Test*`, `test*`. Tests live next to code in **`Tests/`** directories (e.g. `Brokerages/IBKR/Tests/`, `TaxAuthorities/Slovenia/Tests/`, `Core/.../Tests/`) and often use XML or other fixtures.
- **Makefile:** `make format` (black), `make test`, `make test-cov`, `make type-check` (mypy).
- **pyproject.toml:** black (line-length 140), pytest, coverage, mypy (including `disable_error_code = ["import-untyped"]`).

### Adding new behaviour

- **New report type** – Implement or extend the tax authority provider and its report generation (XML/CSV) for that report.
- **New broker** – Add a provider under `src/BrokerageExportProviders/Brokerages/` implementing **CommonBrokerageExportProvider** (see `resources/docs/brokerage-development/translations/README.en.md`).
- **New tax authority (country)** – Add a provider under `src/TaxAuthorityProvider/TaxAuthorities/` implementing the abstract TaxAuthorityProvider interface.

### Docs

- **Usage:** `resources/docs/usage-examples/translations/README.en.md`
- **Broker implementation:** `resources/docs/brokerage-development/translations/README.en.md`
