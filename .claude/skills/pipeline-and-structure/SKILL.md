---
name: pipeline-and-structure
description: Where code goes in the tax report pipeline and how the layers connect (brokers, staging, core, lot matching, tax authorities, DI wiring). Use when adding a broker, a tax authority or a report type, when refactoring across layers, or when working out which layer a change belongs in.
---

# Pipeline and project structure

Broker- and country-specific details live in the **ibkr-flex-query** and **slovenian-tax-edavki** skills; this one covers the layers they
plug into. All paths are under `packages/lib/src/` unless they say otherwise.

## Flow

```
export files (XML strings)
  → BrokerageRegistry.loadAndTransformDetected   detects the broker of each file, runs that broker's provider
  → StagingFinancialEvents                         staging groupings + partial identifier relationships
  → StagingFinancialGroupingProcessor.processStagingFinancialEvents
  → FinancialEvents                                core groupings + resolved identifier relationships
  → TaxAuthorityRegistry.generateExports           picks the country provider, which picks the report generator
  → { xml, csv }
```

The site runs this in the browser (`packages/app/app/components/ibkr/IbkrUploadStep.vue`, `packages/app/app/components/export/SloveniaExportForm.vue`);
the CLI runs it in Node (`packages/cli/main.ts`, through the same two registries).

## Layers

| Layer | Where | Notes |
| --- | --- | --- |
| Broker | `Brokerages/<Broker>/` | Parses export files into a broker-specific container (IBKR: `SegmentedTrades`), merges files, transforms to `StagingFinancialEvents`. Nothing broker-specific leaves this folder. |
| Staging model | `Core/Schemas/Staging/` | Broker-neutral, unprocessed. Groupings are keyed by `StagingFinancialIdentifier.toKey()` (ISIN, ticker and name together), so an instrument that changed ISIN or ticker stays in two groupings until relationships join them. |
| Staging → core | `Core/StagingProcessor/` | `IdentifierRelationshipResolution` pairs partial relationships (a "from" side and a "to" side sharing a `correlationKey`) into whole ones; `StagingToCore.ts` turns each staging event and lot into its core counterpart. |
| Core model | `Core/Schemas/` | `FinancialEvents` = `FinancialGrouping[]` + `IdentifierRelationshipAny[]`. A `FinancialGrouping` holds one instrument's stock trades, stock tax lots, derivative groupings and cash transactions. The instrument is the grouping's `financialIdentifier`; core events and lots don't repeat it. |
| Relationships | `Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts` | Merges groupings across `RENAME`, keeping the original events, and rescales across `SPLIT` / `REVERSE_SPLIT` by building new trades and lots through their constructors (`scaleTradeForSplit`, `scaleLotForSplit`) with a `provenance` step recording what they were. Tax authorities call it with the change types they want applied. |
| Lot matching | `Core/LotMatching/`, `Core/FinancialEvents/FinancialEventsProcessor.ts` | `LotMatchingMethod` implementations (stateless, one `performMatching(trades)`): `FifoLotMatchingMethod`, `ProvidedLotMatchingMethod` (uses the broker's lots). `TaxAuthorityLotMatchingMethod` (`NONE` / `FIFO` / `PROVIDED`) is chosen per report in `TaxAuthorityConfiguration` and turned into a method by `TaxAuthorities/LotMatchingMethodFactory.ts`. `LotMatcher.matchLots` returns `MatchedLot`s whose two `LotLeg`s point at the original trades, with the lot's quantity and its share of the commission. |
| Tax authority | `TaxAuthorities/<Country>/` | A provider implementing `ITaxAuthorityProvider` holds the `TaxAuthorityDescriptor`, maps report type IDs (`"kdvp"`) to its own report types, and turns `FinancialEvents` into XML and CSV through one generator per report type. |
| Lookups | `InfoProviders/` | See the **infoproviders-lookup-data** skill. |
| Config | `TaxAuthorities/ConfigurationProvider.ts` | `TaxPayerConfigSchema` / `TaxPayerInfo`, `TaxAuthorityConfiguration` (`fromDate`, `toDate`, `lotMatchingMethod`). |

## Wiring

`createContainer(infoProvider)` in `container.ts` binds the `InfoProvider` under `InfoProvider.Token`, then loads `CoreModule.ts`,
`Brokerages/BrokeragesModule.ts` and `TaxAuthorities/TaxAuthoritiesModule.ts`. Every class is bound with
`toResolvedValue(factory, [dependencies])` in singleton scope; there are no decorators. Classes take their dependencies through the
constructor, so tests build them by hand without a container.

Anything the app or CLI uses must be exported from `index.ts`. They consume `packages/lib/dist/`, so rebuild lib (`pnpm --filter @brrr/lib build`)
before checking them.

## Adding a broker

1. Create `Brokerages/<Broker>/` with zod schemas for the raw rows (`Schemas/`), an extract service (file → broker container, plus merging
   several files without duplicating rows) and a transform service (→ `StagingFinancialEvents`). Corporate actions become
   `StagingIdentifierRelationshipPartial`s.
2. Add `<Broker>BrokerageExportProvider implements IBrokerageProvider` (`brokerageId`, `displayName`, `isThisValidExport`,
   `describeExportProblem`, `loadAndTransform`). The interface takes XML strings; a broker that exports CSV needs that widened first.
3. Bind it in a `<Broker>Module.ts` and load that from `BrokeragesModule.ts`.
4. `BrokerageRegistry` takes each provider in its constructor and has the IBKR one written into `listBrokerages`, `detectOne` and
   `loadAndTransformDetected`. Add the new provider to all three; staging events from several brokers are combined with
   `StagingFinancialEvents.merge`.
5. Unit tests in `Brokerages/<Broker>/__tests__/`. Anonymised exports go in `packages/test-cases/cases/<Broker>/<Case>/input/`, each case
   declared in a `<broker>` group of the `TestKit` registry (`packages/test-cases/index.ts`: year, named inputs, named expected reports),
   with an acceptance test per case in each tax authority's `__tests__/Acceptance/<Form>.acceptance.test.ts`.
6. Site: icon at `packages/app/public/icons/brokers/<id>.svg` and in `brokerIconById` (`IbkrUploadStep.vue`); a guide in
   `packages/app/app/components/upload/brokerGuides.ts` with screenshots in `packages/app/public/screenshots/brokers/<id>/`; i18n keys in both locale files.

## Adding a tax authority

1. Create `TaxAuthorities/<Country>/` with its report types (an `enum`), schemas for the report lines, a report generator per report type
   (`convert` → lines, `toXml`, `toCsv`), and a provider implementing `ITaxAuthorityProvider` that holds the
   `TaxAuthorityDescriptor`, maps report type IDs to the enum and generates `{ xml, csv }` from one `convert`. Apply identifier
   relationships through `ApplyIdentifierRelationshipsService` before generating.
2. Bind everything in `<Country>Module.ts`, load it from `TaxAuthoritiesModule.ts`, and add the provider to `TaxAuthorityRegistry`
   (constructor, `listAuthorities`, `generateExports`).
3. If the country needs taxpayer fields `TaxPayerConfigSchema` lacks, extend the schema; the CLI and `config/userConfig.example.yml`
   follow it.
4. Site: a card in `packages/app/app/components/export/taxAuthorityCards.ts` (icon in `packages/app/public/icons/tax-authorities/`), a form component
   registered in `authorityForms` in `ExportConfigStep.vue`, a submission guide in `packages/app/app/components/download/taxAuthorityGuides.ts`,
   i18n keys in both locale files.

## Adding a report type to an existing country

Add the enum member, a generator under `ReportGeneration/<Type>/` (generator class + `Xml*.ts` + `Csv*.ts`), the XSD under `XmlSchemas/`,
a case in the provider's `generate`, the ID in the report type ID enum and the provider's `REPORT_TYPES` table, the CLI's
`OUTPUT_FILES`, and the site form's report type options and file names.
