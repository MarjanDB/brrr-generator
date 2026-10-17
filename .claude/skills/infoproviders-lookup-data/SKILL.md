---
name: infoproviders-lookup-data
description: Company, country and treaty lookups (InfoProvider, PredefinedInfoProvider, NodeInfoProvider, the site's ApiInfoProvider) and the JSON fallback files in lib/src/InfoProviders/Node. Use when a dividend report has a blank or wrong payer name, address, country or treaty paragraph, when Yahoo Finance can't resolve an ISIN, or when adding fallback data.
---

# InfoProviders and lookup data

Lives in `lib/src/InfoProviders/`. Today only the Slovenian dividend report (`DivReportGenerator`) uses it, to fill in the dividend
payer's name, address, country and treaty paragraph from the ISIN.

## Providers

| Class | Where | Behaviour |
| --- | --- | --- |
| `InfoProvider` | `InfoProvider.ts` | The interface: `getCompanyInfo(isin)`, `getCountry(name)`, plus add/update/remove/list overrides. `InfoProvider.Token` is its Inversify key. Also defines `CompanyInfo`, `CompanyLocationInfo`, `Country` and `TreatyType`. |
| `PredefinedInfoProvider` | `PredefinedInfoProvider.ts` | In-memory maps only. Use it in tests, filled with exactly the data the test needs. |
| `NodeInfoProvider` | `Node/NodeInfoProvider.ts`, exported as `@brrr/lib/info/node` | The real lookup, Node-only (uses `yahoo-finance2`). Used by the CLI and by the site's server routes. |
| `ApiInfoProvider` | `app/app/utils/ApiInfoProvider.ts` | The browser side: asks `/api/isin/[isin]` and `/api/country/[name]` (`app/server/api/`, which run `NodeInfoProvider`) and caches the answers. |

`createContainer(infoProvider)` takes whichever one the caller needs.

## How NodeInfoProvider resolves

`getCompanyInfo(isin)`:

1. Overrides added at runtime (its internal `PredefinedInfoProvider`).
2. `missingCompaniesLookup.json`, looked up by the ISIN, or by the ticker `missingISINLookup.json` maps that ISIN to.
3. Yahoo Finance: `search(isin)`, then `quoteSummary` with `summaryProfile` for the address and country. A hit is cached as an
   override for the rest of the run.

Whenever the company's country can't be resolved, the result is `null`, and the dividend lines keep blank payer fields.

`getCountry(name)`:

1. Overrides.
2. `specialCountryMappings.json`, then the built-in `ISO_COUNTRY_NAME_TO_ALPHA2` table in `NodeInfoProvider.ts`, for the 2-letter code.
3. `internationalTreaties.json` → `treaties.taxRelief[code]` becomes `TreatyType.TaxRelief`.

## JSON files (`lib/src/InfoProviders/Node/`)

| File | Shape | Add an entry when |
| --- | --- | --- |
| `missingCompaniesLookup.json` | ISIN (or ticker) → `{ shortName, longName, address1, address2?, city, zip, country, state? }`; `country` is a full name that `getCountry` can resolve | Yahoo has nothing, or something wrong, for a company (delisted, renamed, odd listing) |
| `missingISINLookup.json` | ISIN → ticker, which is then used as the key into `missingCompaniesLookup.json` | Several ISINs of one company should share one company entry |
| `specialCountryMappings.json` | country name as Yahoo or the company data spells it → ISO alpha-2 code | A country name isn't in the ISO table (or is spelled differently) |
| `internationalTreaties.json` | `{ "treaties": { "taxRelief": { "<alpha-2>": "<Uradni list reference, paragraph and article>" } } }`, e.g. `"US": "10/01, 2b odstavek 10. člena"` | Slovenia has a double-taxation treaty with that country that grants dividend tax relief |

The JSON is bundled into `lib/dist`, so after editing it rebuild lib (`pnpm --filter @brrr/lib build`) before trying the CLI or the site.
Treaty references come from the
[MF list of treaties](https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-finance/o-ministrstvu/direktorat-za-sistem-davcnih-carinskih-in-drugih-javnih-prihodkov/seznam-veljavnih-konvencij-o-izogibanju-dvojnega-obdavcevanja-dohodka-in-premozenja/).

## Not this skill

`LookupError: Failed to match stock lot` comes from
`Core/StagingProcessor/StagingToCore.ts`: a broker lot whose buy (by transaction ID) or sell (by date) isn't among the
grouping's trades. That is missing or partial export history, or an identifier mismatch between trade and lot, not lookup data. Check
that the uploaded exports cover the whole account history, then the **ibkr-flex-query** transform.
