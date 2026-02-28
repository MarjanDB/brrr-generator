---
name: slovenian-tax-edavki
description: Slovenian tax reporting and EDavki forms (DOH_DIV, DOH_KDVP, D_IFI, DOH_OBR). Use when working on Slovenia tax authority provider, EDavki XML/CSV generation, userConfig.yml taxpayer fields, or Slovenian report types and XSDs.
---

# Slovenian tax and EDavki

Use alongside generic skills (pipeline-and-structure, infoproviders-lookup-data); this skill adds Slovenia/EDavki-specific details.

## Report types

Implemented in `TaxAuthorityProvider.TaxAuthorities.Slovenia.Schemas.ReportTypes.SlovenianTaxAuthorityReportTypes`:

| Report type  | Slovenian label               | Use                 |
| ------------ | ----------------------------- | ------------------- |
| **DOH_DIV**  | Dividende                     | Dividend income     |
| **DOH_KDVP** | Vrednostni papirji            | Securities / shares |
| **D_IFI**    | Izvedeni finančni inštrumenti | Derivatives         |
| **DOH_OBR**  | Obresti                       | Interest            |

## Notebook ↔ report mapping

| Notebook                            | Report type | Lot matching | Date range (example) |
| ----------------------------------- | ----------- | ------------ | -------------------- |
| `notebooks/dividends.ipynb`         | DOH_DIV     | NONE         | 2025–2026            |
| `notebooks/stock trades.ipynb`      | DOH_KDVP    | FIFO         | 2024–2025            |
| `notebooks/derivative trades.ipynb` | D_IFI       | FIFO         | 2025–2026            |

Output files: `Doh_Div_3.xml`, `Doh_KDVP_9.xml`, `D_IFI_4.xml` (and corresponding CSV exports in `exports/`).

## EDavki document workflow types

Used for submission metadata. Defined in `ReportTypes.EDavkiDocumentWorkflowType` (see
[EDavki help](https://edavki.durs.si/EdavkiPortal/PersonalPortal/[360253]/Pages/Help/sl/WorkflowType1.htm)):

- ORIGINAL, SETTLEMENT_ZDAVP2_\_, CORRECTION\_\_, SELF_REPORT, CANCELLED, etc.

## Taxpayer config (userConfig.yml)

`config/userConfig.yml` is read by `ConfigurationProvider` and mapped to **TaxPayerInfo** (`ConfigurationProvider.Configuration`).
Slovenian-oriented fields and defaults:

- **taxNumber**, **taxPayerType** (FO / PO / SP), **name**, **address1**, **address2**, **city**
- **postOfficeNumber** → postNumber, **postOfficeName** → postName, **municipality**
- **birthday** → birthDate, **identity** → maticnaStevilka, **company** → invalidskoPodjetje, **resident**
- Default **countryID** "SI", **countryName** "Slovenia"

## XSDs and report generation

- **XSDs:** `src/TaxAuthorityProvider/TaxAuthorities/Slovenia/XmlSchemas/` (e.g. `Doh_Div_3.xsd`, `Doh_KDVP_9.xsd`, `D_IFI_4.xsd`,
  `Doh_Obr_2.xsd`, `EDP-Common-1.xsd`).
- **Report generation:** `TaxAuthorityProvider.TaxAuthorities.Slovenia.ReportGeneration/` with subfolders DIV, KDVP, IFI (Common, CSV*\*,
  XML*\*).

## EDavki vs broker P/L

Slovenia uses **trade price** (1% of trade price as costs), not cost basis. When comparing with IBKR exports: take realized P/L and add
commissions; generated reports can show higher gains than broker statements. See comments in `ReportGeneration/KDVP/CSV_Doh_KDVP.py` and
`ReportGeneration/IFI/CSV_D_IFI.py`.

## InfoProviders and Slovenia

Country/treaty and company lookups used by the Slovenia provider rely on:

- `src/InfoProviders/internationalTreaties.json` – tax treaties (e.g. tax relief).
- `src/InfoProviders/specialCountryMappings.json` – country name/code overrides.
- `src/InfoProviders/missingCompaniesLookup.json`, `missingISINLookup.json` – fallbacks when ISIN/company resolution fails (helps avoid
  "Failed processing stock lot" where the cause is missing or wrong identifier).

References:
[MF list of treaties](https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-finance/o-ministrstvu/direktorat-za-sistem-davcnih-carinskih-in-drugih-javnih-prihodkov/seznam-veljavnih-konvencij-o-izogibanju-dvojnega-obdavcevanja-dohodka-in-premozenja/),
[FURS international tax](https://www.fu.gov.si/davki_in_druge_dajatve/podrocja/mednarodno_obdavcenje/#c78).
