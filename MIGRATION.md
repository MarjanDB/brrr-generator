# Migration Guide: Python → TypeScript/Deno

This document tracks the migration of brrr-generator from Python 3.12 to TypeScript on Deno.

---

## Phase 1: Project Scaffolding

**Goal:** Set up the Deno workspace structure.

1. Create `deno.json` at repo root with workspace members and task definitions:
   ```json
   {
   	"workspace": ["lib", "app"],
   	"tasks": {
   		"test": "deno test --allow-read",
   		"fmt": "deno fmt",
   		"lint": "deno lint",
   		"type-check": "deno check **/*.ts"
   	}
   }
   ```
2. Create `lib/deno.json` with `compilerOptions: { strict: true }`.
3. Create `app/deno.json` (or `nuxt.config.ts`) for the Nuxt app.
4. Create directory skeleton:
   ```
   lib/brokerages/ibkr/
   lib/core/schemas/
   lib/core/lotMatching/
   lib/core/stagingProcessor/
   lib/taxAuthorities/slovenia/
   lib/infoProviders/
   notebooks/
   app/
   ```
   The `app/` directory is created now as a placeholder. Its internal structure (Nuxt scaffold) is deferred to Phase 9, after parity with
   the Python codebase is achieved.
5. Copy `src/InfoProviders/*.json` lookup files to `lib/infoProviders/` — these require no format changes.

**Python removed:** `Pipfile`, `Pipfile.lock`, `pyproject.toml`, `Makefile`.

---

## Phase 2: Core Schemas

**Goal:** Port Python `@dataclass` and `Enum` definitions to TypeScript interfaces.

**Source files:** `src/Core/FinancialEvents/Schemas/`

| Python                 | TypeScript                       |
| ---------------------- | -------------------------------- |
| `@dataclass class Foo` | `type Foo = { ... }`             |
| `class Bar(Enum)`      | `enum Bar { ... }`               |
| `Generic[A, S]`        | `<A, S>` generic type parameters |
| `Sequence[X]`          | `readonly X[]`                   |
| `X \| None`            | `X \| null`                      |
| `str`                  | `string`                         |
| `float` / `int`        | `number`                         |
| `Arrow` (datetime)     | `luxon.DateTime`                 |

**Files to port:**

- `CommonFormats.py` → `lib/core/schemas/CommonFormats.ts`
  - `GenericAssetClass`, `GenericCategory`, `GenericShortLong`, `GenericDividendType`, `GenericTradeReportItemGainType`,
    `GenericDerivativeReportItemGainType`, `GenericMonetaryExchangeInformation`
- `FinancialIdentifier.py` → `lib/core/schemas/FinancialIdentifier.ts`
  - Class with `isin`, `ticker`, `name`; `isTheSameAs()`, `sameInstrumentByIsin()` methods
- `Events.py` → `lib/core/schemas/Events.ts`
  - `TradeEvent` base interface + all subtypes (stock, derivative, cash transactions)
- `Lots.py` → `lib/core/schemas/Lots.ts`
  - `TaxLot<A, S>`, `TaxLotStock`, `TaxLotDerivative`
- `Grouping.py` → `lib/core/schemas/Grouping.ts`
  - `FinancialGrouping`, `DerivativeGrouping`
- `IdentifierRelationship.py` → `lib/core/schemas/IdentifierRelationship.ts`
  - `IdentifierChangeType`, `IdentifierRelationship`, `IdentifierRelationshipSplit`
- `Provenance.py` → `lib/core/schemas/Provenance.ts`
- `LotMatchingConfiguration.py` → `lib/core/schemas/LotMatchingConfiguration.ts`
- `FinancialEvents.py` → `lib/core/schemas/FinancialEvents.ts`

Also port the staging schemas from `src/Core/StagingFinancialEvents/Schemas/` to `lib/core/schemas/staging/`.

---

## Phase 3: Lot Matching

**Goal:** Port lot matching strategies.

**Source files:**

- `src/Core/LotMatching/Services/LotMatcher.py`
- `src/Core/LotMatching/Services/FifoLotMatchingMethod.py`
- `src/Core/LotMatching/Services/ProvidedLotMatchingMethod.py`

**Target:** `lib/core/lotMatching/`

Key translation notes:

- The `LotMatcher` selects strategy based on `TaxAuthorityLotMatchingMethod` config.
- FIFO: iterate open buy lots oldest-first; match against sell quantity; create `TaxLotStock` records; handle partial lots.
- PROVIDED: use broker-assigned lot IDs (IBKR open/close lot pairs) for direct matching.
- NONE: return empty lot list (events reported individually by tax authority).

Tests live in `lib/core/lotMatching/Tests/`.

---

## Phase 4: Staging Processor

**Goal:** Port `StagingFinancialGroupingProcessor` and its dependencies.

**Source files:**

- `src/Core/StagingFinancialEvents/Services/StagingFinancialGroupingProcessor.py`
- Event and lot processors in `src/Core/StagingFinancialEvents/Services/`

**Target:** `lib/core/stagingProcessor/`

This is the core translation engine:

- Accepts `StagingFinancialEvents` (from broker layer)
- Resolves partial identifier relationships (matches staging relationship partials using `sameInstrumentByIsin`)
- Applies lot matching per grouping
- Returns `FinancialEvents` with resolved `FinancialGrouping[]` and `IdentifierRelationship[]`

Also port `ApplyIdentifierRelationshipsService` (merges groupings by RENAME relationships) to `lib/core/stagingProcessor/`.

Tests live in `lib/core/stagingProcessor/Tests/`.

---

## Phase 5: IBKR Broker Provider

**Goal:** Port the IBKR Flex Query XML parser.

**Source file:** `src/BrokerageExportProviders/Brokerages/IBKR/IbkrBrokerageExportProvider.py`

**Target:** `lib/brokerages/ibkr/IbkrBrokerageExportProvider.ts`

XML parsing: use **`fast-xml-parser`**. It works in both Deno and the browser with no DOM dependency, keeping `lib/` reusable from Nuxt.

```typescript
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const doc = parser.parse(xmlString);
```

Key Python → TypeScript translation for IBKR:

- `lxml.etree` → `fast-xml-parser` (`XMLParser`)
- `arrow.get(str)` → `DateTime.fromISO(str)` (luxon)
- String-to-enum coercion → TypeScript `enum` lookup

Tests live in `lib/brokerages/ibkr/Tests/` with XML fixture files from `src/BrokerageExportProviders/Brokerages/IBKR/Tests/`.

---

## Phase 6: Slovenian Tax Authority

**Goal:** Port the Slovenian eDavki report generators.

**Source file:** `src/TaxAuthorityProvider/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.py`

**Target:** `lib/taxAuthorities/slovenia/`

Report generation: use **`fast-xml-parser`** (`XMLBuilder`) for XML construction, and **`csv-generate`** for CSV output.

```typescript
import { XMLBuilder } from "fast-xml-parser";

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "" });
const xml = builder.build(reportObject);
```

Port each report type (dividends, stock trades, derivative trades) as a separate class/function.

Also port `ConfigurationProvider` to read `userConfig` — in notebooks use `Deno.readTextFile`; in the web app the user provides config via
the UI.

Tests live in `lib/taxAuthorities/slovenia/Tests/`.

---

## Phase 7: Info Providers

**Goal:** Make lookup JSON files available to `lib/`.

**Source files:**

- `src/InfoProviders/missingISINLookup.json`
- `src/InfoProviders/missingCompaniesLookup.json`
- Other lookup JSON files

**Target:** `lib/infoProviders/`

No format changes needed. Import directly in TypeScript:

```typescript
import missingISIN from "../infoProviders/missingISINLookup.json" with { type: "json" };
```

This works in both Deno and Nuxt (Vite handles JSON imports natively).

---

## Phase 8: Deno Notebooks

**Goal:** Convert `.ipynb` notebooks to use the Deno TypeScript kernel.

**Source:** `notebooks/*.ipynb` (currently Python kernel)

**Target:** same files, updated to Deno kernel

Steps:

1. Install the Deno Jupyter kernel: `deno jupyter --install`
2. In each notebook, change the kernel metadata from `python3` to `deno`.
3. Replace Python cell code with TypeScript equivalents following the notebook pattern in `ARCHITECTURE.md`.
4. Verify each notebook runs end-to-end.

Notebook pattern (TypeScript):

```typescript
import { IbkrBrokerageExportProvider } from "../lib/brokerages/ibkr/IbkrBrokerageExportProvider.ts";
import { StagingFinancialGroupingProcessor } from "../lib/core/stagingProcessor/StagingFinancialGroupingProcessor.ts";
import { SlovenianTaxAuthorityProvider } from "../lib/taxAuthorities/slovenia/SlovenianTaxAuthorityProvider.ts";

const xml = await Deno.readTextFile("imports/flex-query.xml");
const provider = new IbkrBrokerageExportProvider();
const staging = provider.loadAndTransform([xml]);
const processor = new StagingFinancialGroupingProcessor(/* infoProviders */);
const events = processor.process(staging);
const authority = new SlovenianTaxAuthorityProvider(config);
authority.generateStockReport(events, { year: 2024, lotMatching: "FIFO" });
```

---

## Phase 9: Nuxt Web App

**Prerequisites:** Phases 1–8 complete (full parity with Python codebase).

**Goal:** Build a client-side Nuxt 3 app wrapping `lib/`.

**Target:** `app/` (directory created in Phase 1; scaffolded here)

This phase begins only after the core library (`lib/`), notebooks, and tests are at parity with the Python implementation. The Nuxt app is a
thin UI layer over `lib/` — `lib/` must be stable before building the app.

Steps:

1. Scaffold: `npx nuxi init app` (or `deno run -A npm:nuxi init app`) inside the existing `app/` directory.
2. Configure `nuxt.config.ts` for static site generation (`ssr: false`).
3. Create upload page: `app/pages/index.vue`
   - `<input type="file" accept=".xml">` for broker XML
   - Optional config inputs (year, taxpayer details)
4. Wire file reading in `app/utils/processReport.ts`:
   ```typescript
   export async function processReport(file: File): Promise<string> {
   	const xml = await file.text();
   	// call lib/ pipeline
   	return generatedXml;
   }
   ```
5. Trigger browser download of generated report using `URL.createObjectURL(new Blob([xml]))`.
6. No server routes; deploy as static files.

---

## Phase 10: Testing

**Goal:** Port tests to Deno test format with equivalent coverage.

**Source:** `src/**/Tests/` directories

**Target:** `lib/**/Tests/` directories

Python `pytest` → Deno built-in test:

```typescript
// Python
def test_fifo_lot_matching():
    assert result == expected

// TypeScript
import { assertEquals } from "jsr:@std/assert";

Deno.test("FIFO lot matching", () => {
  assertEquals(result, expected);
});
```

- Use `jsr:@std/assert` for assertions (available without install in Deno).
- Copy XML/JSON fixture files alongside test files.
- Run with `deno task test`.

---

## Python → TypeScript Translation Reference

### Dependencies

| Python                       | TypeScript/Deno equivalent                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| `arrow`                      | `luxon` (`npm:luxon`) — `DateTime`, `Duration`                     |
| `lxml` / `xml.etree`         | `fast-xml-parser` — `XMLParser` for input, `XMLBuilder` for output |
| `pandas` (CSV output)        | `csv-generate` (`npm:csv-generate`)                                |
| `pandas` (data manipulation) | Plain `Array` methods + `Intl.NumberFormat` for formatting         |
| `pycountry`                  | Static JSON lookup or `npm:i18n-iso-countries`                     |
| `opyoid` (DI)                | Constructor injection / factory functions (no framework)           |
| `pytest`                     | `deno test` + `jsr:@std/assert`                                    |
| `black`                      | `deno fmt`                                                         |
| `mypy`                       | TypeScript strict mode (`"strict": true` in `deno.json`)           |
| `pipenv`                     | `deno.json` + `deno cache`                                         |
| `PyYAML`                     | `npm:js-yaml` or JSON config                                       |

### Language constructs

| Python                                    | TypeScript                                           |
| ----------------------------------------- | ---------------------------------------------------- |
| `@dataclass class Foo`                    | `type Foo = { ... }` (plain type alias)              |
| `class Bar(Enum)`                         | `enum Bar { A = "A", B = "B" }`                      |
| `Generic[A, S]`                           | `<A, S>` generic parameters                          |
| `Sequence[X]`                             | `readonly X[]`                                       |
| `X \| None`                               | `X \| null`                                          |
| `Optional[X]`                             | `X \| undefined` or `X \| null`                      |
| `Union[A, B]`                             | `A \| B`                                             |
| `TypeVar("T", bound=Foo)`                 | `<T extends Foo>`                                    |
| `@staticmethod`                           | `static` method                                      |
| `@classmethod`                            | `static` method returning `this` / factory pattern   |
| `__str__`                                 | `toString()`                                         |
| `__eq__`                                  | Custom `equals()` method (no operator overloading)   |
| `__hash__`                                | Not needed; use `Map`/`Set` with string keys instead |
| `dataclasses.field(default_factory=list)` | `= []` in interface, or initialize in constructor    |
| `from __future__ import annotations`      | Not needed in TypeScript                             |
| `if __name__ == "__main__"`               | Not needed; Deno scripts run directly                |

### Patterns

| Python pattern                        | TypeScript equivalent                                       |
| ------------------------------------- | ----------------------------------------------------------- |
| `isinstance(x, Foo)`                  | Type guard: `function isFoo(x): x is Foo`                   |
| `match x: case Foo():`                | `if` chain with type guards or discriminated union `switch` |
| Multiple inheritance                  | Interface composition                                       |
| `@abstractmethod`                     | `abstract` class or interface                               |
| Context manager (`with`)              | `try/finally` or explicit cleanup                           |
| Generator (`yield`)                   | Generator function (`function*`) or async iterator          |
| List comprehension                    | `array.filter(...).map(...)`                                |
| Dict comprehension                    | `Object.fromEntries(array.map(...))`                        |
| `sorted(items, key=lambda x: x.date)` | `[...items].sort((a, b) => ...)`                            |
