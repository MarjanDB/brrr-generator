import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import {
  GenericAssetClass,
  GenericCategory,
  GenericDividendType,
  GenericTradeReportItemGainType,
  GenericDerivativeReportItemGainType,
  GenericShortLong,
} from "@brrr/core/schemas/CommonFormats.ts";
import type { FinancialGrouping, DerivativeGrouping } from "@brrr/core/schemas/Grouping.ts";
import type {
  TradeEventStockAcquired,
  TradeEventStockSold,
  TradeEventDerivativeAcquired,
  TradeEventDerivativeSold,
  TradeEventCashTransactionDividend,
  TradeEventCashTransactionWithholdingTax,
} from "@brrr/core/schemas/Events.ts";
import type { TaxLotStock, TaxLotDerivative } from "@brrr/core/schemas/Lots.ts";
import type { FinancialEvents } from "@brrr/core/schemas/FinancialEvents.ts";
import { TaxPayerType, TaxAuthorityLotMatchingMethod } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { TaxPayerInfo, TaxAuthorityConfiguration } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/taxAuthorities/slovenia/schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/taxAuthorities/slovenia/SlovenianTaxAuthorityProvider.ts";

const simpleTaxPayer: TaxPayerInfo = {
  taxNumber: "taxNumber",
  taxpayerType: TaxPayerType.PHYSICAL_SUBJECT,
  name: "name",
  address1: "address1",
  address2: "address2",
  city: "city",
  postNumber: "postNumber",
  postName: "postName",
  municipalityName: "municipality",
  birthDate: DateTime.fromISO("2000-01-01"),
  maticnaStevilka: "maticna",
  invalidskoPodjetje: false,
  resident: true,
  activityCode: "",
  activityName: "",
  countryId: "SI",
  countryName: "Slovenia",
};

const stockAcquired: TradeEventStockAcquired = {
  kind: "StockAcquired",
  id: "ID1",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  assetClass: GenericAssetClass.STOCK,
  date: DateTime.fromISO("2023-06-06"),
  multiplier: 1.0,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: 1.0,
    underlyingTradePrice: 1.0,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 1,
  },
  acquiredReason: GenericTradeReportItemGainType.BOUGHT,
  provenance: [],
};

const stockSold: TradeEventStockSold = {
  kind: "StockSold",
  id: "ID2",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  assetClass: GenericAssetClass.STOCK,
  date: DateTime.fromISO("2023-06-07"),
  multiplier: 1.0,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: -1.0,
    underlyingTradePrice: 1.0,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 1,
  },
  provenance: [],
};

const optionBought: TradeEventDerivativeAcquired = {
  kind: "DerivativeAcquired",
  id: "ID1",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
  assetClass: GenericAssetClass.OPTION,
  date: DateTime.fromISO("2023-06-07"),
  multiplier: 100,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: 1.0,
    underlyingTradePrice: 1.0,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 1,
  },
  provenance: [],
};

const optionSold: TradeEventDerivativeSold = {
  kind: "DerivativeSold",
  id: "ID2",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  assetClass: GenericAssetClass.OPTION,
  date: DateTime.fromISO("2023-06-08"),
  multiplier: 100,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: -1.0,
    underlyingTradePrice: 1.5,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 1,
  },
  provenance: [],
};

const cashTransactionDividend: TradeEventCashTransactionDividend = {
  kind: "CashTransactionDividend",
  id: "ID",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
  date: DateTime.fromISO("2023-06-07"),
  multiplier: 1,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: 1.0,
    underlyingTradePrice: 10.0,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 0.5,
  },
  actionId: "DivAction",
  transactionId: "TranId1",
  listingExchange: "EXH",
  dividendType: GenericDividendType.ORDINARY,
  provenance: [],
};

const cashTransactionWithholdingTax: TradeEventCashTransactionWithholdingTax = {
  kind: "CashTransactionWithholdingTax",
  id: "ID",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
  assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
  date: DateTime.fromISO("2023-06-07"),
  multiplier: 1,
  exchangedMoney: {
    underlyingCurrency: "EUR",
    underlyingQuantity: 1.0,
    underlyingTradePrice: -5.0,
    comissionCurrency: "EUR",
    comissionTotal: 0.0,
    taxCurrency: "EUR",
    taxTotal: 0.0,
    fxRateToBase: 0.5,
  },
  actionId: "DivAction",
  transactionId: "TranId1",
  listingExchange: "EXH",
  provenance: [],
};

const stockLot: TaxLotStock = {
  id: "ID1",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
  quantity: 1.0,
  acquired: stockAcquired,
  sold: stockSold,
  shortLongType: GenericShortLong.LONG,
  provenance: [],
};

const derivativeLot: TaxLotDerivative = {
  id: "ID1",
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
  quantity: 1.0,
  acquired: optionBought,
  sold: optionSold,
  shortLongType: GenericShortLong.LONG,
  provenance: [],
};

const derivativeGrouping: DerivativeGrouping = {
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
  derivativeTrades: [optionBought, optionSold],
  derivativeTaxLots: [derivativeLot],
  provenance: [],
};

const testGrouping: FinancialGrouping = {
  financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
  countryOfOrigin: null,
  underlyingCategory: GenericCategory.REGULAR,
  stockTrades: [stockAcquired, stockSold],
  stockTaxLots: [stockLot],
  derivativeGroupings: [derivativeGrouping],
  cashTransactions: [cashTransactionDividend, cashTransactionWithholdingTax],
  provenance: [],
};

const testData: FinancialEvents = {
  groupings: [testGrouping],
  identifierRelationships: [],
};

Deno.test("testKdvpSimpleCsv - 2 rows with correct quantities", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData);

  assertEquals(rows.length, 2, "Only 2 rows should be present");
  assertEquals((rows[0] as Record<string, unknown>)["quantity"], 1, "The first line should be the buy line");
  assertEquals((rows[1] as Record<string, unknown>)["quantity"], -1, "The second line should be the sell line");
});

Deno.test("testKdvpSimpleXml - 1 purchase and 1 sale in XML", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const xml = provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData);

  const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
  const saleCount = (xml.match(/<Sale>/g) ?? []).length;

  assertEquals(purchaseCount, 1, "There should only be one purchase");
  assertEquals(saleCount, 1, "There should only be one sale");
});

Deno.test("testIfiSimpleCsv - 2 rows with correct quantities", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.D_IFI, testData);

  assertEquals(rows.length, 2, "Only 2 rows should be present");
  assertEquals((rows[0] as Record<string, unknown>)["quantity"], 1, "The first line should be the buy line");
  assertEquals((rows[1] as Record<string, unknown>)["quantity"], -1, "The second line should be the sell line");
});

Deno.test("testIfiSimpleXml - 1 purchase and 1 sale in XML", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const xml = provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.D_IFI, testData);

  const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
  const saleCount = (xml.match(/<Sale>/g) ?? []).length;

  assertEquals(purchaseCount, 1, "There should only be one purchase");
  assertEquals(saleCount, 1, "There should only be one sale");
});

Deno.test("testDivSimpleCsv - 1 row with correct amounts", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData);

  assertEquals(rows.length, 1, "Only 1 row should be present, because dividend and withholding tax are related");
  assertEquals(rows[0]["Znesek dividend (v EUR)"], 10.0, "The dividend amount should equal 10");
  assertEquals(rows[0]["Tuji davek (v EUR)"], 5.0, "The dividend withheld tax should be 5");
  assertEquals(rows[0]["Znesek dividend (v Originalni Valuti)"], 20, "The original dividend amount should equal 20");
  assertEquals(rows[0]["Tuji davek (v Originalni Valuti)"], 10.0, "The original dividend withheld tax should be 10");
});

Deno.test("testDivSimpleXml - 1 dividend line in XML", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const xml = provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData);

  const dividendCount = (xml.match(/<Dividend>/g) ?? []).length;
  assertEquals(dividendCount, 1, "There should be 1 dividend line");
});

Deno.test("testGenerateReportDataKdvpReturnsTypedList - report has items with events", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const reportData = provider.generateReportData(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData) as {
    items: { events: unknown[] }[];
  }[];

  assertEquals(Array.isArray(reportData), true);
  assertEquals(reportData.length >= 1, true);
  assertEquals(reportData[0].items !== null, true);
  assertEquals(reportData[0].items[0].events.length, 2);
});

Deno.test("testGenerateReportDataDivReturnsTypedSequence - 1 dividend with correct amounts", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const reportData = provider.generateReportData(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData) as {
    dividendAmount: number;
    foreignTaxPaid: number;
  }[];

  assertEquals(Array.isArray(reportData), true);
  assertEquals(reportData.length, 1);
  assertEquals(reportData[0].dividendAmount, 10.0);
  assertEquals(reportData[0].foreignTaxPaid, 5.0);
});

Deno.test("testGenerateReportDataIfiReturnsTypedList - report has items", () => {
  const config: TaxAuthorityConfiguration = {
    fromDate: DateTime.fromISO("2023-01-01"),
    toDate: DateTime.fromISO("2024-01-01"),
    lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
  };

  const provider = new SlovenianTaxAuthorityProvider(simpleTaxPayer, config);
  const reportData = provider.generateReportData(SlovenianTaxAuthorityReportTypes.D_IFI, testData) as {
    items: unknown[];
  }[];

  assertEquals(Array.isArray(reportData), true);
  assertEquals(reportData.length >= 1, true);
  assertEquals(reportData[0].items.length, 2);
});
