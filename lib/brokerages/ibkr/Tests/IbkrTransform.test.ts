import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import {
  AssetClass,
  BuyOrSell,
  CashTransactionType,
  Codes,
  LevelOfDetail,
  OpenCloseIndicator,
  OrderType,
  SecurityIDType,
  SubCategory,
  TransactionType,
} from "@brrr/brokerages/ibkr/schemas/IbkrSchemas.ts";
import type { LotStock, TradeStock, TransactionCash, CorporateAction } from "@brrr/brokerages/ibkr/schemas/IbkrSchemas.ts";
import type { SegmentedTrades } from "@brrr/brokerages/ibkr/schemas/SegmentedTrades.ts";
import { convertSegmentedTradesToGenericUnderlyingGroups } from "@brrr/brokerages/ibkr/transforms/Transform.ts";
import { IdentifierRelationshipResolution } from "@brrr/core/stagingProcessor/IdentifierRelationshipResolution.ts";
import { StagingIdentifierChangeType } from "@brrr/core/schemas/staging/IdentifierRelationship.ts";

function makeDate(iso: string) {
  return DateTime.fromISO(iso)!;
}

function makeEmptySegmented(overrides: Partial<SegmentedTrades>): SegmentedTrades {
  return {
    cashTransactions: [],
    corporateActions: [],
    stockTrades: [],
    stockLots: [],
    derivativeTrades: [],
    derivativeLots: [],
    ...overrides,
  };
}

const simpleTradeBuy: TradeStock = {
  clientAccountID: "test",
  currency: "EUR",
  fxRateToBase: 1,
  assetClass: AssetClass.STOCK,
  subCategory: SubCategory.COMMON,
  symbol: "TEST",
  description: "",
  conid: "conid",
  securityID: "securityid",
  securityIDType: SecurityIDType.ISIN,
  cusip: "cusip",
  isin: "US21212112",
  figi: "FIGI2121312",
  listingExchange: "NYSE",
  reportDate: makeDate("2023-01-01"),
  dateTime: makeDate("2023-01-01T13:00:15"),
  tradeDate: makeDate("2023-01-01"),
  transactionType: TransactionType.EXCHANGE_TRADE,
  exchange: "EXCHA",
  quantity: 2,
  tradePrice: 15,
  tradeMoney: 30,
  proceeds: 1,
  taxes: 0,
  ibCommission: 2,
  ibCommissionCurrency: "EUR",
  netCash: -33,
  netCashInBase: -33,
  closePrice: 15,
  openCloseIndicator: OpenCloseIndicator.OPEN,
  notesAndCodes: [Codes.OPENING_TRADE],
  costBasis: 33,
  fifoProfitAndLossRealized: 0,
  capitalGainsProfitAndLoss: 0,
  forexProfitAndLoss: 0,
  marketToMarketProfitAndLoss: 0,
  buyOrSell: BuyOrSell.BUY,
  transactionID: "ID",
  orderTime: makeDate("2023-01-01T13:00:02"),
  levelOfDetail: LevelOfDetail.EXECUTION,
  changeInPrice: 0,
  changeInQuantity: 2,
  orderType: OrderType.LIMIT,
  accruedInterest: 0,
};

const simpleTradeSell: TradeStock = {
  ...simpleTradeBuy,
  quantity: -2,
  tradePrice: -15,
  tradeMoney: -30,
  netCash: 33,
  netCashInBase: 33,
  openCloseIndicator: OpenCloseIndicator.CLOSE,
  buyOrSell: BuyOrSell.SELL,
  transactionID: "ID2",
};

const simpleStockLot: LotStock = {
  clientAccountID: "test",
  currency: "EUR",
  fxRateToBase: 1,
  assetClass: AssetClass.STOCK,
  subCategory: SubCategory.COMMON,
  symbol: "TEST",
  description: "",
  conid: "conid",
  securityID: "securityid",
  securityIDType: SecurityIDType.ISIN,
  cusip: "cusip",
  isin: "US21212112",
  figi: "FIGI2121312",
  listingExchange: "NYSE",
  multiplier: 1,
  reportDate: makeDate("2023-01-05"),
  dateTime: makeDate("2023-01-05T13:00:15"),
  tradeDate: makeDate("2023-01-05"),
  exchange: "EXCHA",
  quantity: 2,
  tradePrice: 15,
  openCloseIndicator: OpenCloseIndicator.CLOSE,
  notesAndCodes: [Codes.CLOSING_TRADE],
  costBasis: 33,
  fifoProfitAndLossRealized: 5,
  capitalGainsProfitAndLoss: 5,
  forexProfitAndLoss: 0,
  buyOrSell: BuyOrSell.SELL,
  transactionID: "ID",
  openDateTime: makeDate("2023-01-01T13:00:15"),
  holdingPeriodDateTime: makeDate("2023-01-01T13:00:15"),
  levelOfDetail: LevelOfDetail.CLOSED_LOT,
};

const dividend: TransactionCash = {
  clientAccountID: "FakeAccount",
  currency: "USD",
  fxRateToBase: 1.2,
  assetClass: AssetClass.CASH,
  subCategory: SubCategory.COMMON,
  symbol: "TTE",
  description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Ordinary Dividend)",
  conid: "29612193",
  securityID: "FR0000120271",
  securityIDType: SecurityIDType.ISIN,
  cusip: null,
  isin: "FR0000120271",
  figi: null,
  listingExchange: "SBF",
  dateTime: makeDate("2023-01-01T02:00:00"),
  settleDate: makeDate("2023-01-01"),
  amount: 2.64,
  type: CashTransactionType.DIVIDEND,
  code: null,
  transactionID: "269176073",
  reportDate: makeDate("2023-01-01"),
  actionID: "102869793",
};

const withholdingTaxForDividend: TransactionCash = {
  ...dividend,
  description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE - FR TAX",
  amount: -0.66,
  type: CashTransactionType.WITHHOLDING_TAX,
  transactionID: "323614082",
};

const paymentInLieuOfDividend: TransactionCash = {
  ...dividend,
  description: "TTE(FR0000120271) CASH DIVIDEND USD 0.66 PER SHARE (Payment in Lieu of Dividends)",
  type: CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
};

const withholdingTaxForPaymentInLieu: TransactionCash = {
  ...dividend,
  description: "TTE(FR0000120271) PAYMENT IN LIEU OF DIVIDEND - FR TAX",
  amount: -0.66,
  type: CashTransactionType.WITHHOLDING_TAX,
  transactionID: "323614082",
};

const corporateActionOld: CorporateAction = {
  clientAccountID: "U1",
  accountAlias: null,
  model: null,
  currency: "USD",
  fxRateToBase: 0.90354,
  assetClass: AssetClass.STOCK,
  subCategory: SubCategory.COMMON,
  symbol: "SMCI.OLD",
  description: "SMCI SPLIT",
  conid: "43261373",
  securityID: "US86800U1043",
  securityIDType: SecurityIDType.ISIN,
  cusip: "86800U104",
  isin: "US86800U1043",
  figi: null,
  listingExchange: "NASDAQ",
  underlyingConid: null,
  underlyingSymbol: null,
  underlyingSecurityID: null,
  underlyingListingExchange: null,
  multiplier: 1.0,
  strike: null,
  expiry: null,
  putOrCall: null,
  principalAdjustFactor: null,
  reportDate: makeDate("2024-10-01"),
  dateTime: makeDate("2024-09-30T20:25:00"),
  actionDescription: "SPLIT",
  amount: 0.0,
  proceeds: 0.0,
  value: 0.0,
  quantity: -4.0,
  fifoProfitAndLossRealized: 0.0,
  capitalGainsProfitAndLoss: 0.0,
  forexProfitAndLoss: 0.0,
  marketToMarketProfitAndLoss: 0.0,
  notesAndCodes: [],
  type: "FI",
  transactionID: "3131760419",
  actionID: "141913764",
  levelOfDetail: LevelOfDetail.DETAIL,
  serialNumber: null,
  deliveryType: null,
  commodityType: null,
  fineness: 0.0,
  weight: 0.0,
};

const corporateActionNew: CorporateAction = {
  ...corporateActionOld,
  symbol: "SMCI",
  isin: "US86800U3023",
  securityID: "US86800U3023",
  quantity: 40.0,
  transactionID: "3131760429",
};

Deno.test("transform: single stock trade buy", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ stockTrades: [simpleTradeBuy] }),
  );
  assertEquals(result.groupings.length, 1);
  assertEquals(result.groupings[0].financialIdentifier.getIsin(), "US21212112");
  assertEquals(result.groupings[0].stockTrades[0].financialIdentifier.getIsin(), "US21212112");
  assertEquals(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity, 2);
});

Deno.test("transform: single stock trade sell", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ stockTrades: [simpleTradeSell] }),
  );
  assertEquals(result.groupings.length, 1);
  assertEquals(result.groupings[0].stockTrades[0].exchangedMoney.underlyingQuantity, -2);
});

Deno.test("transform: single stock lot", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ stockLots: [simpleStockLot] }),
  );
  assertEquals(result.groupings.length, 1);
  assertEquals(result.groupings[0].financialIdentifier.getIsin(), "US21212112");
  assertEquals(result.groupings[0].stockTaxLots[0].financialIdentifier.getIsin(), "US21212112");
});

Deno.test("transform: single dividend", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ cashTransactions: [dividend] }),
  );
  assertEquals(result.groupings.length, 1);
  assertEquals(result.groupings[0].financialIdentifier.getIsin(), "FR0000120271");
  assertEquals(result.groupings[0].cashTransactions[0].kind, "StagingCashTransactionDividend");
  assertEquals(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice, dividend.amount * dividend.fxRateToBase);
  assertEquals(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingQuantity, 1);
});

Deno.test("transform: single payment in lieu of dividend", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ cashTransactions: [paymentInLieuOfDividend] }),
  );
  assertEquals(result.groupings[0].cashTransactions[0].kind, "StagingCashTransactionPaymentInLieuOfDividends");
  assertEquals(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice, paymentInLieuOfDividend.amount * paymentInLieuOfDividend.fxRateToBase);
});

Deno.test("transform: single withholding tax", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ cashTransactions: [withholdingTaxForDividend] }),
  );
  assertEquals(result.groupings[0].cashTransactions[0].kind, "StagingCashTransactionWithholdingTax");
  assertEquals(result.groupings[0].cashTransactions[0].exchangedMoney.underlyingTradePrice, withholdingTaxForDividend.amount * withholdingTaxForDividend.fxRateToBase);
});

Deno.test("transform: withholding tax for payment in lieu", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ cashTransactions: [withholdingTaxForPaymentInLieu] }),
  );
  assertEquals(result.groupings[0].cashTransactions[0].kind, "StagingCashTransactionWithholdingTaxForPaymentInLieuOfDividends");
});

Deno.test("transform: corporate actions produce partial relationships only", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ corporateActions: [corporateActionOld, corporateActionNew] }),
  );
  assertEquals(result.identifierRelationships.relationships.length, 0);
  assertEquals(result.identifierRelationships.partialRelationships.length, 2);
  const keys = new Set(result.identifierRelationships.partialRelationships.map((p) => p.correlationKey));
  assertEquals(keys.has("141913764"), true);
  const fromPartial = result.identifierRelationships.partialRelationships.find((p) => p.fromIdentifier !== null && p.toIdentifier === null)!;
  const toPartial = result.identifierRelationships.partialRelationships.find((p) => p.toIdentifier !== null && p.fromIdentifier === null)!;
  assertEquals(fromPartial.fromIdentifier!.getIsin(), "US86800U1043");
  assertEquals(toPartial.toIdentifier!.getIsin(), "US86800U3023");
  assertEquals(fromPartial.changeType, StagingIdentifierChangeType.SPLIT);
});

Deno.test("transform: resolve partials produces full relationship", () => {
  const staging = convertSegmentedTradesToGenericUnderlyingGroups(
    makeEmptySegmented({ corporateActions: [corporateActionOld, corporateActionNew] }),
  );
  const resolved = new IdentifierRelationshipResolution().resolveStagingFinancialEventsPartialRelationships(staging);
  assertEquals(resolved.identifierRelationships.relationships.length, 1);
  assertEquals(resolved.identifierRelationships.relationships[0].fromIdentifier.getIsin(), "US86800U1043");
  assertEquals(resolved.identifierRelationships.relationships[0].toIdentifier.getIsin(), "US86800U3023");
  assertEquals(resolved.identifierRelationships.relationships[0].changeType, StagingIdentifierChangeType.SPLIT);
});

Deno.test("transform: no corporate actions produces no partials", () => {
  const result = convertSegmentedTradesToGenericUnderlyingGroups(makeEmptySegmented({}));
  assertEquals(result.identifierRelationships.relationships.length, 0);
  assertEquals(result.identifierRelationships.partialRelationships.length, 0);
});
