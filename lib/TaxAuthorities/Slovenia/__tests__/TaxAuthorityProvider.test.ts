import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events.ts";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import { TaxLot } from "@brrr/Core/Schemas/Lots.ts";
import { NodeInfoProvider } from "@brrr/InfoProviders/Node/NodeInfoProvider.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.ts";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

function makeProvider(taxPayerInfo: TaxPayerInfo, config: TaxAuthorityConfiguration): SlovenianTaxAuthorityProvider {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	return new SlovenianTaxAuthorityProvider(
		taxPayerInfo,
		config,
		new ApplyIdentifierRelationshipsService(),
		new KdvpReportGenerator(processor),
		new DivReportGenerator(new NodeInfoProvider()),
		new IfiReportGenerator(processor),
	);
}

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
	birthDate: makeDate("2000-01-01"),
	maticnaStevilka: "maticna",
	invalidskoPodjetje: false,
	resident: true,
	activityCode: "",
	activityName: "",
	countryId: "SI",
	countryName: "Slovenia",
};

const stockAcquired = new TradeEventStockAcquired({
	id: "ID1",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-06-06"),
	multiplier: 1.0,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: 1.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	provenance: [],
});

const stockSold = new TradeEventStockSold({
	id: "ID2",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-06-07"),
	multiplier: 1.0,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: -1.0,
		underlyingTradePrice: 1.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	provenance: [],
});

const optionBought = new TradeEventDerivativeAcquired({
	id: "ID1",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	acquiredReason: GenericDerivativeReportItemGainType.BOUGHT,
	assetClass: GenericAssetClass.OPTION,
	date: makeDate("2023-06-07"),
	multiplier: 100,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: 1.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	provenance: [],
});

const optionSold = new TradeEventDerivativeSold({
	id: "ID2",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.OPTION,
	date: makeDate("2023-06-08"),
	multiplier: 100,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: -1.0,
		underlyingTradePrice: 1.5,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	provenance: [],
});

const cashTransactionDividend = new TradeEventCashTransactionDividend({
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-07"),
	multiplier: 1,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: 10.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 0.5,
	}),
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
});

const cashTransactionWithholdingTax = new TradeEventCashTransactionWithholdingTax({
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-07"),
	multiplier: 1,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: -5.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 0.5,
	}),
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	provenance: [],
});

const stockLot = new TaxLot({
	id: "ID1",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	quantity: 1.0,
	acquired: stockAcquired,
	sold: stockSold,
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const derivativeLot = new TaxLot({
	id: "ID1",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	quantity: 1.0,
	acquired: optionBought,
	sold: optionSold,
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const derivativeGrouping = new DerivativeGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	derivativeTrades: [optionBought, optionSold],
	derivativeTaxLots: [derivativeLot],
	provenance: [],
});

const testGrouping = new FinancialGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	countryOfOrigin: null,
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [stockAcquired, stockSold],
	stockTaxLots: [stockLot],
	derivativeGroupings: [derivativeGrouping],
	cashTransactions: [cashTransactionDividend, cashTransactionWithholdingTax],
	provenance: [],
});

const testData = new FinancialEvents({
	groupings: [testGrouping],
	identifierRelationships: [],
});

Deno.test("testKdvpSimpleCsv - 2 rows with correct quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const generator = new KdvpReportGenerator(processor);
	const items = generator.convert(config, testData.groupings);
	const events = items.flatMap((item) => item.items.flatMap((line) => line.events));

	assertEquals(events.length, 2, "Only 2 rows should be present");
	assertEquals(events[0].quantity, 1, "The first line should be the buy line");
	assertEquals(events[1].quantity, -1, "The second line should be the sell line");
});

Deno.test("testKdvpSimpleXml - 1 purchase and 1 sale in XML", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const xml = await provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData);

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	assertEquals(purchaseCount, 1, "There should only be one purchase");
	assertEquals(saleCount, 1, "There should only be one sale");
});

Deno.test("testIfiSimpleCsv - 2 rows with correct quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const generator = new IfiReportGenerator(processor);
	const items = generator.convert(config, testData.groupings);
	const rows = items.flatMap((item) => item.items);

	assertEquals(rows.length, 2, "Only 2 rows should be present");
	assertEquals(rows[0].quantity, 1, "The first line should be the buy line");
	assertEquals(rows[1].quantity, -1, "The second line should be the sell line");
});

Deno.test("testIfiSimpleXml - 1 purchase and 1 sale in XML", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const xml = await provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.D_IFI, testData);

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	assertEquals(purchaseCount, 1, "There should only be one purchase");
	assertEquals(saleCount, 1, "There should only be one sale");
});

Deno.test("testDivSimpleCsv - 1 row with correct amounts", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const generator = new DivReportGenerator(new NodeInfoProvider());
	const rows = await generator.convert(config, testData.groupings);

	assertEquals(rows.length, 1, "Only 1 row should be present, because dividend and withholding tax are related");
	assertEquals(rows[0].dividendAmount, 10.0, "The dividend amount should equal 10");
	assertEquals(rows[0].foreignTaxPaid, 5.0, "The dividend withheld tax should be 5");
	assertEquals(rows[0].dividendAmountInOriginalCurrency, 20, "The original dividend amount should equal 20");
	assertEquals(rows[0].foreignTaxPaidInOriginalCurrency, 10.0, "The original dividend withheld tax should be 10");
});

Deno.test("testDivSimpleXml - 1 dividend line in XML", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const xml = await provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData);

	const dividendCount = (xml.match(/<Dividend>/g) ?? []).length;
	assertEquals(dividendCount, 1, "There should be 1 dividend line");
});

Deno.test("testGenerateReportDataKdvpReturnsTypedList - report has items with events", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const reportData = await provider.generateReportData(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData) as {
		items: { events: unknown[] }[];
	}[];

	assertEquals(Array.isArray(reportData), true);
	assertEquals(reportData.length >= 1, true);
	assertEquals(reportData[0].items !== null, true);
	assertEquals(reportData[0].items[0].events.length, 2);
});

Deno.test("testGenerateReportDataDivReturnsTypedSequence - 1 dividend with correct amounts", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const reportData = await provider.generateReportData(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData) as {
		dividendAmount: number;
		foreignTaxPaid: number;
	}[];

	assertEquals(Array.isArray(reportData), true);
	assertEquals(reportData.length, 1);
	assertEquals(reportData[0].dividendAmount, 10.0);
	assertEquals(reportData[0].foreignTaxPaid, 5.0);
});

Deno.test("testGenerateReportDataIfiReturnsTypedList - report has items", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const reportData = await provider.generateReportData(SlovenianTaxAuthorityReportTypes.D_IFI, testData) as {
		items: unknown[];
	}[];

	assertEquals(Array.isArray(reportData), true);
	assertEquals(reportData.length >= 1, true);
	assertEquals(reportData[0].items.length, 2);
});
