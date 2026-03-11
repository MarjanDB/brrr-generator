---
name: infoproviders-lookup-data
description: When and how to edit InfoProviders lookup JSONs (company, country, treaty, ISIN). Use when fixing "Failed processing stock lot", wrong country or company data, or adding fallbacks for unresolved identifiers.
---

# InfoProviders and lookup data

Generic guidance for `src/InfoProviders/` and the JSON lookup files. Country-specific use (e.g. treaty format) may be documented in a
tax-authority skill.

## Where lookups are used

- **CompanyLookupProvider** – Resolves ISIN to company info (name, address, country). Tries online lookup first; falls back to
  **missingCompaniesLookup.json** and **missingISINLookup.json**.
- **CountryLookupProvider** – Resolves country name to 2-letter code and treaty info. Uses **internationalTreaties.json** and
  **specialCountryMappings.json**.

Tax authority report generation and staging processors use these when annotating events (e.g. company domicile, treaty relief).

## When to edit which file

| Symptom                                                      | Likely fix                                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"Failed processing stock lot"** or "Failed lookup of ISIN" | Lot or event has an identifier (ISIN/ticker) the pipeline can’t resolve. Add or correct an entry in **missingISINLookup.json** (ISIN → ticker for online lookup) or **missingCompaniesLookup.json** (ISIN → full company object for offline fallback). |
| Wrong or missing **company** name/address                    | Add or update entry in **missingCompaniesLookup.json** for that identifier (e.g. ISIN).                                                                                                                                                                |
| Online lookup fails for a known ISIN/ticker                  | Add **missingISINLookup.json** entry: key = ISIN, value = ticker symbol used by the lookup service (e.g. for yfinance).                                                                                                                                |
| Wrong **country** code or unknown country name               | Add or update **specialCountryMappings.json**: key = country name as in broker/data, value = 2-letter ISO code.                                                                                                                                        |
| **Treaty** reference (e.g. tax relief) for a country         | Add or update **internationalTreaties.json** under the structure used by CountryLookupProvider (e.g. treaties by country code). Exact key/value format is defined by the tax authority; see country-specific skill if applicable.                      |

## File formats (generic)

- **missingISINLookup.json** – Object: identifier (e.g. ISIN) → string (e.g. ticker). Used when resolution by identifier fails so the
  provider can try again with the mapped value.
- **missingCompaniesLookup.json** – Object: identifier (e.g. ISIN) → company object. Company object typically has fields such as shortName,
  longName, address1, address2, city, zip, country (and optionally state). Used when no online company data is available.
- **specialCountryMappings.json** – Object: country name (as in data) → 2-letter country code. Overrides default country resolution.
- **internationalTreaties.json** – Nested structure (e.g. treaties.taxRelief) keyed by country code; values are treaty references. Structure
  and semantics depend on the tax authority; see country skill for details.

All paths are under `src/InfoProviders/`. After editing, re-run the pipeline; no separate reload step is required.
