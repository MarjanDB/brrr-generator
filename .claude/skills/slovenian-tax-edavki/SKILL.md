---
name: slovenian-tax-edavki
description: Slovenian eDavki reports (DOH_KDVP, DOH_DIV, D_IFI; DOH_OBR not implemented) and how lib generates them — report generators, XML/CSV output, XSDs, taxpayer fields, workflow types, dividend and treaty handling. Use when changing anything under lib/src/TaxAuthorities/Slovenia, the Slovenian export form on the site, the CLI's report options, or userConfig.yml.
---

# Slovenian tax reports (eDavki)

Lives in `lib/src/TaxAuthorities/Slovenia/`. For how a tax authority plugs into the pipeline, see the **pipeline-and-structure** skill;
for company, country and treaty data, see **infoproviders-lookup-data**.

## Report types

`SlovenianTaxAuthorityReportTypes` in `Schemas/ReportTypes.ts`:

| Enum | ID (site, CLI, registry) | Covers | Generator | Lot matching |
| --- | --- | --- | --- | --- |
| `DOH_KDVP` | `kdvp` | Shares (Vrednostni papirji) | `ReportGeneration/Kdvp/KdvpReportGenerator.ts` | FIFO, or the broker's lots with `PROVIDED` |
| `DOH_DIV` | `div` | Dividends (Dividende) | `ReportGeneration/Div/DivReportGenerator.ts` | none |
| `D_IFI` | `ifi` | Derivatives (Izvedeni finančni inštrumenti) | `ReportGeneration/Ifi/IfiReportGenerator.ts` | FIFO, or `PROVIDED` |

`createLotMatchingMethod` (`TaxAuthorities/LotMatchingMethodFactory.ts`) turns anything other than `PROVIDED` (including `NONE`)
into FIFO. The site and the CLI both send FIFO and a
report period of 1 January to 1 January of the following year.

## Flow inside the country

- `SlovenianTaxAuthorityProvider` (`ITaxAuthorityProvider`) holds the `TaxAuthorityDescriptor` (`authorityId: "slovenia"`) and the
  `REPORT_TYPES` table mapping IDs (`SlovenianReportTypeId`) to the enum. `generate` applies `RENAME`, `SPLIT` and `REVERSE_SPLIT`
  relationships, calls the generator's `convert` once → report lines, and renders them with `toXml` and `toCsv` into `{ xml, csv }`.
- Shared amount helpers (`round`, `toOriginalCurrency`, `foreignTaxOf`) are in `ReportGeneration/Amounts.ts`.
- Each generator keeps the pure pieces in `Xml*.ts` (built with fast-xml-parser's `XMLBuilder`) and `Csv*.ts` (built with
  `csv-stringify/browser/esm/sync`, never the Node build). Report line classes are in `Schemas/Schemas.ts`.

## Per-report rules

- **KDVP:** `FinancialEventsProcessor.stockLotLegsClosedInPeriod` lot-matches each grouping and keeps only the legs of lots closed inside the
  report period, so earlier buys of shares sold this year appear too. Lines carry trade prices and commissions in the base currency plus the
  original currency. Core gain types map to eDavki ones through `GAIN_MAPPINGS`. The XML is always filed as `ORIGINAL`.
- **IFI:** the same lot matching per derivative grouping (one per option contract), mapped through its own `GAIN_MAPPINGS`, sorted by
  name.
- **DIV:** keeps cash transactions inside the period, pairs withholding tax with its dividend (a withholding without a matching dividend
  throws), merges dividends of one ISIN paid on the same day, then fills payer name, address, country and the treaty paragraph from the
  `InfoProvider` using the ISIN. That lookup is best-effort: when it fails, the fields stay blank and the report still generates. Amounts
  are rounded to 2 decimals and foreign tax is made positive. The XML is always filed as `ORIGINAL`; `isSelfReport` (the report period
  ended before last year) only sets DOH_DIV's `SelfReport` flag.

`EDavkiDocumentWorkflowType` lists every workflow code eDavki accepts
([help page](https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm)).

## Taxpayer fields

`TaxPayerConfigSchema` in `lib/src/TaxAuthorities/ConfigurationProvider.ts`: `taxNumber`, `taxpayerType` (`FO` natural person, `PO` legal
entity, `SP` sole trader), `name`, `address1`, `address2` (nullable), `city`, `postNumber`, `postName`, `municipalityName`, `birthDate`,
`maticnaStevilka`, `invalidskoPodjetje`, `resident`, `activityCode`, `activityName`, `countryId`, `countryName`.

- The CLI reads `config/userConfig.yml` (template: `config/userConfig.example.yml`) with js-yaml and validates it with this schema.
  Keep the example in step with the schema.
- The site's `app/app/components/export/SloveniaExportForm.vue` asks for tax number, name, address, city, post number and name, and
  country, and fills the rest with fixed defaults (`FO`, resident, empty strings).

## Output

| Report | XML | CSV |
| --- | --- | --- |
| KDVP | `Doh_KDVP.xml` | `export-trades.csv` |
| DIV | `Doh_Div.xml` | `export-dividends.csv` |
| IFI | `D_Ifi.xml` | `export-derivatives.csv` |

The same names appear in `standalone/cli/main.ts` (`OUTPUT_FILES`) and `SloveniaExportForm.vue` (`FILENAMES`). The site's upload
instructions for eDavki are in `app/app/components/download/taxAuthorityGuides.ts`.

## XSDs

`XmlSchemas/`: `Doh_KDVP_9.xsd`, `Doh_Div_3.xsd`, `D_IFI_4.xsd`, `Doh_Obr_2.xsd`, `EDP-Common-1.xsd`. When FURS publishes a new version,
replace the file and update the namespace and version in the matching `Xml*.ts`. `.vscode/settings.json` maps generated XML in
`exports/` to these files for validation in the editor.

## Tests

The expected XML and CSV for every report live with their test cases in `test-cases/cases/<Broker>/<Case>/expected/slovenia/`
(`kdvp-fifo`, `kdvp-provided`, `ifi-fifo`, `div`; each case covers one year, declared in the `TestKit` registry and reached as
`case.expected.slovenia.kdvpFifo`). The acceptance tests in `lib/src/__tests__/Acceptance/` compare against them byte for
byte, so never regenerate them to make a refactor pass. `Fixtures.taxPayer` and `Fixtures.lookups`
(`lib/src/__tests__/support/Fixtures.ts`) are the taxpayer and the company and country data they were generated with.

`__tests__/`: `TaxAuthorityProvider.integration.test.ts` (all three reports' lines, builds the provider by hand in `makeProvider` to spy
on its collaborators), `PaymentInLieuOfDividend.unit.test.ts`, `CsvWithoutNodeBuffer.unit.test.ts` (CSV generators without Node's
`Buffer`). `ReportGeneration/Div/__tests__/DivReportGenerator.unit.test.ts` pins DIV's sums, same-day merge and rounding,
`ReportGeneration/__tests__/Amounts.unit.test.ts` the shared amount helpers, and
`TaxAuthorities/__tests__/LotMatchingMethodFactory.unit.test.ts` the lot matching choice. Tests build their data and report configs
with `Scenario` (`lib/src/__tests__/support/Scenario.ts`), writing every value out, and give the dividend generator a
`PredefinedInfoProvider` with the companies and countries they need, so they never call Yahoo Finance.

## References

- [MF list of double-taxation treaties](https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-finance/o-ministrstvu/direktorat-za-sistem-davcnih-carinskih-in-drugih-javnih-prihodkov/seznam-veljavnih-konvencij-o-izogibanju-dvojnega-obdavcevanja-dohodka-in-premozenja/)
- [FURS international taxation](https://www.fu.gov.si/davki_in_druge_dajatve/podrocja/mednarodno_obdavcenje/#c78)
