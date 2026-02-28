# Architecture

## Overview

**brrr-generator** (IB-tax-calculator) generates country-specific tax authority reports from broker activity statements. It is written in
TypeScript and runs on Deno.

**Tech stack:**

- **Deno** — runtime, tooling (`deno test`, `deno fmt`, `deno lint`), Jupyter kernel
- **TypeScript** — strict mode throughout
- **Nuxt 3** — client-side-only web app (no server; all processing runs in-browser)

**Key dependencies (declared in `lib/deno.json`):**

- **`luxon`** — date/time operations (`DateTime`, `Duration`)
- **`fast-xml-parser`** — XML parsing (broker input) and XML generation (report output)
- **`csv-generate`** — CSV report generation

**No-server philosophy:** The Nuxt app does zero server-side processing. Broker XML files are loaded via the browser `File`/`FileReader`
API, processed entirely in `lib/` (which has no Deno-specific dependencies), and the generated report is offered as a browser download.

---

## Repository Layout

```
lib/                              # Core library (reusable engine)
├── brokerages/                   # Broker-specific parsers (broker XML → staging)
│   └── ibkr/                     # Interactive Brokers Flex Query XML
│       ├── Tests/
│       └── IbkrBrokerageExportProvider.ts
├── core/                         # Domain model + algorithms
│   ├── schemas/                  # TypeScript interfaces/types
│   ├── lotMatching/              # FIFO, PROVIDED, NONE strategies
│   └── stagingProcessor/         # StagingFinancialEvents → FinancialEvents
├── taxAuthorities/               # Country-specific report generators
│   └── slovenia/                 # Slovenian eDavki reports
│       └── Tests/
└── infoProviders/                # ISIN/company lookup data (JSON files)
    ├── missingISINLookup.json
    └── missingCompaniesLookup.json

notebooks/                        # Deno Jupyter notebooks (entry points)
├── dividends.ipynb
├── stock-trades.ipynb
└── derivative-trades.ipynb

app/                              # Nuxt 3 web app (client-side only)
├── components/
├── pages/
└── utils/                        # Thin wrappers around lib/

imports/                          # Local XML files (gitignored)
exports/                          # Generated reports (gitignored)
config/                           # userConfig (gitignored)
resources/                        # Docs, images
deno.json                         # Workspace config + tasks
```

---

## Core Data Flow

The same 5-stage pipeline runs whether invoked from a notebook or the web app:

```
imports/
  └── [broker XML files]
         │
         ▼
  IbkrBrokerageExportProvider          (Stage 1: Parse)
         │  CommonBrokerageEvents (e.g. SegmentedTrades)
         ▼
  broker Transform                     (Stage 2: Transform)
         │  StagingFinancialEvents
         │  (StagingFinancialGrouping[] + staging IdentifierRelationship partials)
         ▼
  StagingFinancialGroupingProcessor    (Stage 3: Resolve)
         │  FinancialEvents
         │  (FinancialGrouping[] + IdentifierRelationship[])
         ▼
  ApplyIdentifierRelationshipsService  (Stage 4: Merge — inside TaxAuthorityProvider)
         │  merged FinancialGrouping[]
         ▼
  TaxAuthorityProvider                 (Stage 5: Report)
         │
         ▼
  exports/
    ├── report.xml
    └── report.csv
```

---

## Key Types

### `FinancialIdentifier`

Identifies a traded instrument. At least one of `isin`, `ticker`, or `name` must be set.

```typescript
interface FinancialIdentifier {
	isin: string | null;
	ticker: string | null;
	name: string | null;
}
```

Equality uses strict rules: ISIN alone (no ticker/name), ISIN + ticker (no name), or ISIN + ticker + name. The `sameInstrumentByIsin` helper
is used for corporate-action resolution where only ISIN matters (e.g. ticker changed: `RKLB.OLD` → `RKLB`).

### `TradeEvent` union

Base event type with ID, identifier, asset class, date, multiplier, exchanged money, and provenance. Concrete subtypes:

| Type                                                      | Description                     |
| --------------------------------------------------------- | ------------------------------- |
| `TradeEventStockAcquired`                                 | Stock buy with `acquiredReason` |
| `TradeEventStockSold`                                     | Stock sell                      |
| `TradeEventDerivativeAcquired`                            | Derivative buy                  |
| `TradeEventDerivativeSold`                                | Derivative sell                 |
| `TradeEventCashTransactionDividend`                       | Dividend cash event             |
| `TradeEventCashTransactionWithholdingTax`                 | Withholding tax event           |
| `TradeEventCashTransactionPaymentInLieuOfDividend`        | Payment in lieu                 |
| `TradeEventCashTransactionWithholdingTaxForPaymentInLieu` | Withholding tax on PIL          |

### `TaxLot<A, S>`

A matched pair of an acquired event and a sold event, with quantity.

```typescript
interface TaxLot<A extends TradeEvent, S extends TradeEvent> {
	id: string;
	financialIdentifier: FinancialIdentifier;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: "SHORT" | "LONG";
	provenance: ProvenanceStep[];
}

type TaxLotStock = TaxLot<TradeEventStockAcquired, TradeEventStockSold>;
type TaxLotDerivative = TaxLot<TradeEventDerivativeAcquired, TradeEventDerivativeSold>;
```

### `FinancialGrouping`

All activity for one financial identifier (after staging resolution):

```typescript
interface FinancialGrouping {
	financialIdentifier: FinancialIdentifier;
	countryOfOrigin: string | null;
	underlyingCategory: GenericCategory;
	stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[];
	stockTaxLots: TaxLotStock[];
	derivativeGroupings: DerivativeGrouping[];
	cashTransactions: TransactionCash[];
	provenance: ProvenanceStep[];
}
```

### `IdentifierRelationship`

Directed edge: `fromIdentifier` was superseded by `toIdentifier`.

```typescript
type IdentifierChangeType = "RENAME" | "SPLIT" | "REVERSE_SPLIT";

interface IdentifierRelationship {
	fromIdentifier: FinancialIdentifier;
	toIdentifier: FinancialIdentifier;
	changeType: IdentifierChangeType;
	effectiveDate: Temporal.PlainDate; // or Date
}

interface IdentifierRelationshipSplit extends IdentifierRelationship {
	quantityBefore: number;
	quantityAfter: number;
}
```

---

## lib/ Design Principles

1. **No Deno-specific dependencies** — `lib/` must not use `Deno.*` APIs. All dependencies (`luxon`, `fast-xml-parser`, `csv-generate`) are
   npm packages that work in both Deno and the browser.
2. **No Deno-specific APIs** — no `Deno.readFile`, `Deno.args`, etc. File I/O is the caller's responsibility (notebook or app passes in
   strings/buffers).
3. **Pure TypeScript** — no decorators, no reflect-metadata, no DI framework.
4. **Readonly arrays** — prefer `readonly T[]` over mutable arrays in interfaces.
5. **Explicit imports** — no barrel re-exports that obscure the dependency graph.

---

## Notebook Pattern

Each notebook follows this pattern:

```typescript
// 1. Read XML files from imports/
const xml = await Deno.readTextFile("imports/flex-query.xml");

// 2. Parse with broker provider
const provider = new IbkrBrokerageExportProvider();
const staging = await provider.loadAndTransform([xml]);

// 3. Resolve staging → core
const processor = new StagingFinancialGroupingProcessor(/* infoProviders */);
const financialEvents = processor.process(staging);

// 4. Generate report
const config = loadUserConfig("config/userConfig.yml");
const authority = new SlovenianTaxAuthorityProvider(config);
authority.generateReport(financialEvents, { year: 2024, lotMatching: "FIFO" });
// → writes to exports/
```

---

## Web App Pattern

The Nuxt app (`app/`) is fully client-side:

1. User uploads broker XML via `<input type="file">`.
2. `FileReader` reads the file content as a string.
3. Utility in `app/utils/` calls into `lib/` — same pipeline as notebooks, no file I/O.
4. Generated XML/CSV report is offered as a browser download via a `Blob` URL.

No data leaves the browser. The app is deployable as a static site (e.g. GitHub Pages).

---

## Lot Matching

Three strategies implemented in `lib/core/lotMatching/`:

| Method     | Description                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `NONE`     | No lot matching; events reported individually. Used for dividends.                                        |
| `FIFO`     | First-in, first-out. Each sell is matched against the oldest open buy lot(s). Partial lots are supported. |
| `PROVIDED` | Lot assignments provided explicitly by the broker (IBKR assignment IDs).                                  |

The lot matcher is invoked by `StagingFinancialGroupingProcessor` per grouping, producing `TaxLotStock[]` / `TaxLotDerivative[]` stored in
the resulting `FinancialGrouping`.

---

## Corporate Actions

`IdentifierRelationship` records carry corporate action information through the pipeline. Three types:

| Type            | Description                                       | Effect                                                    |
| --------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `RENAME`        | Ticker/name change; same ISIN, no quantity change | Groupings merged by `ApplyIdentifierRelationshipsService` |
| `SPLIT`         | 1 share → N shares under new identifier           | Quantity scaled; basis adjusted                           |
| `REVERSE_SPLIT` | N shares → 1 share under new identifier           | Quantity scaled; basis adjusted                           |

`IdentifierRelationshipSplit` carries `quantityBefore` and `quantityAfter` for scaling calculations.

---

## Adding a New Broker

1. Create `lib/brokerages/<broker-name>/` directory.
2. Implement `CommonBrokerageExportProvider` interface:
   - `loadAndTransform(xmlStrings: string[]): StagingFinancialEvents`
3. Add tests in `lib/brokerages/<broker-name>/Tests/` with sample XML fixtures.
4. See `resources/docs/brokerage-development/translations/README.en.md` for detailed guidance.

## Adding a New Tax Authority

1. Create `lib/taxAuthorities/<country>/` directory.
2. Implement the abstract `TaxAuthorityProvider` interface:
   - `generateReport(events: FinancialEvents, config: ReportConfig): void`
3. Add tests in `lib/taxAuthorities/<country>/Tests/`.

---

## Testing

- **Runner:** `deno test` (built-in, no additional test framework needed).
- **File convention:** `*.test.ts` files co-located next to source in `Tests/` subdirectories.
- **Fixtures:** XML and JSON fixture files stored alongside test files.
- **Tasks:**
  - `deno task test` — run all tests
  - `deno task test --coverage` — with coverage report
  - `deno task fmt` — format with `deno fmt`
  - `deno task lint` — lint with `deno lint`
  - `deno task type-check` — `deno check **/*.ts`
