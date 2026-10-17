---
name: ibkr-flex-query
description: Interactive Brokers Flex Query XML and how lib parses and transforms it (IbkrSchemas, SegmentedTrades, IbkrExtractService, IbkrTransformService). Use when changing IBKR parsing or transformation, supporting a new IBKR row type, field or corporate action, debugging a Flex Query that fails to load, or adding IBKR test fixtures.
---

# IBKR Flex Query

The broker layer for Interactive Brokers, in `lib/src/Brokerages/Ibkr/`. For the layers it feeds, see the **pipeline-and-structure**
skill.

## Files

| File | Role |
| --- | --- |
| `Schemas/IbkrSchemas.ts` | Enums for IBKR codes (`AssetClass`, `BuyOrSell`, `CashTransactionType`, `Codes`, …) and a zod schema per row type: `TradeStock`, `LotStock`, `TradeDerivative`, `LotDerivative`, `CorporateAction`, `TransactionCash`. Also `FlexQueryResponseSchema` for the document. |
| `Schemas/SegmentedTrades.ts` | The broker container: `cashTransactions`, `corporateActions`, `stockTrades`, `stockLots`, `derivativeTrades`, `derivativeLots`. |
| `Extract.ts` | `IbkrExtractService`: `extractFromXML(xml)` → `SegmentedTrades`; `mergeTrades(list)` combines several files. |
| `Transform.ts` | `IbkrTransformService.convertSegmentedTradesToStagingEvents` → `StagingFinancialEvents`. |
| `IbkrBrokerageExportProvider.ts` | `IBrokerageProvider` with `brokerageId = "ibkr"`. A file counts as IBKR when `extractFromXML` doesn't throw. |
| `IbkrModule.ts` | Inversify bindings. |

## Parsing

`fast-xml-parser` runs with `ignoreAttributes: false, attributeNamePrefix: ""`, so every XML attribute becomes a plain string property.
`FlexQueryResponseSchema` turns missing sections into empty ones and single elements into one-element arrays (`toArray`), so a file with
one trade parses the same as a file with many.

Under `FlexQueryResponse/FlexStatements/FlexStatement` (one per account and period):

| Element | Filter | Row schema |
| --- | --- | --- |
| `Trades/Trade` | `assetCategory="STK"` | `TradeStock` |
| `Trades/Lot` | `assetCategory="STK"` | `LotStock` |
| `Trades/Trade` | `assetCategory="OPT"` | `TradeDerivative` |
| `Trades/Lot` | `assetCategory="OPT"` | `LotDerivative` |
| `CashTransactions/CashTransaction` | — | `TransactionCash` |
| `CorporateActions/CorporateAction` | — | `CorporateAction` |

Other asset categories are skipped. Each row schema is `z.preprocess` + `z.object`, using the shared primitives at the top of the file:
`zStrNullable` / `zNumNullable` turn `""` into `null`, and dates are parsed against `_DATE_FORMATS` (after swapping `EDT`/`EST` for an
offset) into a `ValidDateTime`. A new field or code goes into the row schema and, for a fixed set of values, an enum. An unknown enum value
fails the whole file, which then shows up as "not an IBKR export".

The site's guide tells users to enable the Trades, Cash Transactions and Corporate Actions sections with all fields, and to export one
calendar year per file covering the whole account history (`broker_ibkr_*` keys in `app/i18n/locales/`).

## Merging files

`mergeTrades` de-duplicates trades, cash transactions and corporate actions by `transactionID`, so overlapping exports are fine for those.
Lots have no unique ID and are concatenated, so overlapping exports duplicate lots.

## Transform

- Identifiers: stock trades, stock lots and cash transactions use `isin` + `symbol`; options use `underlyingSecurityID` + `symbol` +
  `description`, so each option contract is a grouping of its own that carries the underlying's ISIN.
- Money: prices and commissions are multiplied by `fxRateToBase`, i.e. converted to the account's base currency.
- Direction: a positive `quantity` is an acquisition, otherwise a sale.
- Cash transactions: `Dividends`, `Withholding Tax` and `Payment In Lieu Of Dividends`. The dividend type comes from the description
  ("ordinary dividend", "bonus dividend"). A withholding tax whose description mentions "payment in lieu of dividend" becomes the
  payment-in-lieu variant. Any other type throws `Unknown cash transaction type`.
- Corporate actions become partial identifier relationships: type `IC` → `RENAME`, `FI` → `SPLIT` (with the quantity), anything else
  `UNKNOWN` (dropped during staging processing). The row whose symbol ends in `.OLD` is the "from" side; `actionID` is the correlation
  key that pairs it with the "to" side.

## Tests and fixtures

- Every IBKR export a test reads is a case in `test-cases/cases/Ibkr/`, read through `TestKit.ibkr` (`@brrr/test-cases`):
  `stockTrade`, `optionTrade`, `dividends`, `paymentInLieuOfDividends`, `duplicatingTrades` (repeated executions that must reach KDVP
  once), `corporateAction`, `corporateActionsTwoRows` (SMCI's `FI` split rows), `split` (hand-written SMCI trades before and after that
  split, which must reach KDVP scaled ten times), and `allFixtures` (all of them together except `split`).
- `__tests__/IbkrExtract.unit.test.ts` parses those exports. `__tests__/IbkrTransform.unit.test.ts` transforms raw rows built with
  `Scenario.build.ibkr` (`tradeStock`, `lotStock`, `cashTransaction`, `corporateAction`, each with every field defaulted).
- `lib/src/__tests__/Acceptance/Ibkr/` runs each case end to end into the Slovenian reports and compares them with the case's
  `expected/` files.
- Fixtures are trimmed, anonymised Flex Query output: keep the real attribute names and value formats, and never paste a real account's
  export.
