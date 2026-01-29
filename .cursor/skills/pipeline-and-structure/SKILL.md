---
name: pipeline-and-structure
description: Where to change what in the tax report pipeline (new report type, new broker, new tax authority). Use when adding features, refactoring, or navigating the codebase to find the right layer.
---

# Pipeline and project structure

Generic guidance for this project. For country- or broker-specific details, use the complementary skills (e.g. slovenian-tax-edavki, ibkr-flex-query).

## Where to change what

| Goal                                     | Location                                                                          | Notes                                                                                                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **New report type** (same tax authority) | Tax authority provider under `src/TaxAuthorityProvider/TaxAuthorities/<Country>/` | Extend report generation (XML/CSV) and report type enum; reuse existing grouping and lot matching.                                                                                                                                                     |
| **New broker**                           | `src/BrokerageExportProviders/Brokerages/<Broker>/`                               | Implement **CommonBrokerageExportProvider**: discover files, load to broker-specific type (CommonBrokerageEvents), merge, transform to sequence of **StagingFinancialGrouping**. See `resources/docs/brokerage-development/translations/README.en.md`. |
| **New tax authority (country)**          | `src/TaxAuthorityProvider/TaxAuthorities/<Country>/`                              | Implement abstract TaxAuthorityProvider (generateExportForTaxAuthority, generateSpreadsheetExport); add config/schemas and report generation as needed.                                                                                                |
| **Lot matching logic**                   | `src/Core/LotMatching/` and tax authority report generation                       | NONE / FIFO / PROVIDED are configured per report; implementation lives in Core and in how each tax authority uses the processor.                                                                                                                       |
| **Staging → core processing**            | `src/Core/StagingFinancialEvents/`                                                | Event and lot processors (stock, derivative, cash); grouping processor. Change here when the broker-agnostic staging format or core domain model changes.                                                                                              |
| **Company/country/treaty lookups**       | `src/InfoProviders/` and lookup JSONs                                             | Use the **infoproviders-lookup-data** skill for when and how to edit the JSONs.                                                                                                                                                                        |

## Key types (generic)

- **CommonBrokerageEvents** – Broker-specific container. Transformed into **StagingFinancialGrouping** (sequence, one per instrument).
- **StagingFinancialGrouping** – Broker-agnostic staging model. Input to **StagingFinancialGroupingProcessor**.
- **FinancialGrouping** – Core domain model (processed events, lot-matched lots). Input to **TaxAuthorityProvider**.
- **TaxAuthorityConfiguration** – Report window (fromDate, toDate) and lot matching method; no country-specific fields here.

## Pipeline flow

imports → broker (Extract + Transform) → StagingFinancialGrouping[] → StagingFinancialGroupingProcessor → FinancialGrouping[] → TaxAuthorityProvider → exports

Broker and tax authority implementations are isolated in their own trees; the core pipeline (StagingFinancialEvents, FinancialEvents, LotMatching) stays broker- and country-agnostic.
