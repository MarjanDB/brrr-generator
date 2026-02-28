---
name: ibkr-flex-query
description: IBKR Flex Query XML structure and how it maps to SegmentedTrades. Use when editing IBKR Extract/Transform, adding transaction types, debugging XML parsing, or working with IBKR test fixtures.
---

# IBKR Flex Query (broker-specific)

Complement to the generic **pipeline-and-structure** skill. This skill covers only the Interactive Brokers Flex Query format and its
handling in this project.

## Source and layout

- **Input:** XML files produced by IBKR Flex Queries (Activity Statement / Tax-Relevant export). Placed in `imports/`; discovered by
  **IbkrBrokerageExportProvider** (all `*.xml` in that folder).
- **Extract:** `src/BrokerageExportProviders/Brokerages/IBKR/Transforms/Extract.py` parses the XML into **SegmentedTrades** (IBKR’s
  implementation of CommonBrokerageEvents).
- **Transform:** `Transform.py` converts SegmentedTrades to a sequence of **StagingFinancialGrouping** (broker-agnostic).

## XML structure (XPath roots)

Root path: `/FlexQueryResponse/FlexStatements/FlexStatement/`. Extract uses:

| Section           | XPath                                | Extractor               | Result          |
| ----------------- | ------------------------------------ | ----------------------- | --------------- |
| Cash transactions | `CashTransactions/*`                 | extractCashTransaction  | TransactionCash |
| Corporate actions | `CorporateActions/*`                 | extractCorporateActions | CorporateAction |
| Stock trades      | `Trades/Trade[@assetCategory='STK']` | extractStockTrade       | TradeStock      |
| Stock lots        | `Trades/Lot[@assetCategory='STK']`   | extractStockLot         | LotStock        |
| Option trades     | `Trades/Trade[@assetCategory='OPT']` | extractOptionTrade      | TradeDerivative |
| Option lots       | `Trades/Lot[@assetCategory='OPT']`   | extractOptionLot        | LotDerivative   |

Elements are XML nodes with attributes; Extract reads `node.attrib["..."]` and maps to schemas in **Schemas.py** (e.g. TradeStock, LotStock,
TransactionCash, CorporateAction). Parsing helpers (dates, optional values) are in **ValueParsingUtils**.

## Schemas and types

- **Schemas.py** – Dataclasses and enums for IBKR concepts: AssetClass (STK, CASH, OPT), SubCategory, SecurityIDType, Codes (transaction
  notes), TradeStock, LotStock, TradeDerivative, LotDerivative, TransactionCash, CorporateAction, etc.
- **SegmentedTrades.py** – Container type: cashTransactions, corporateActions, stockTrades, stockLots, derivativeTrades, derivativeLots.
  This is the type returned by `extractFromXML(root)` and passed to merge and Transform.

## Adding or changing extraction

1. Adjust or add XPath in `extractFromXML` and the corresponding extractor function.
2. Add or extend dataclasses in Schemas.py if new attributes or node types are needed.
3. Use **ValueParsingUtils** for optional attributes and date parsing to stay consistent with existing code.
4. Add or update fixtures under `Brokerages/IBKR/Tests/*.xml` and tests in TestIbkrExtract.py / TestIbkrTransform.py.

## Test fixtures

Sample XMLs in `src/BrokerageExportProviders/Brokerages/IBKR/Tests/` (e.g. SimpleStockTrade.xml, SimpleCashTransactionOfDividends.xml,
SimpleOptionTrade.xml) are used by the IBKR tests. When changing Extract or schema, update or add fixtures and tests accordingly.
