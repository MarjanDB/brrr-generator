import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events.ts";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
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

const derivativeGrouping = new DerivativeGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	derivativeTrades: [optionBought, optionSold],
	derivativeTaxLots: [],
	provenance: [],
});

const testGrouping = new FinancialGrouping({
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	countryOfOrigin: null,
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [stockAcquired, stockSold],
	stockTaxLots: [],
	derivativeGroupings: [derivativeGrouping],
	cashTransactions: [],
	provenance: [],
});

const testData = new FinancialEvents({
	groupings: [testGrouping],
	identifierRelationships: [],
});

Deno.test("SloveniaFifo - testKdvpSimpleCsv - 2 rows with correct quantities", () => {
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

Deno.test("SloveniaFifo - testKdvpSimpleXml - 1 purchase and 1 sale in XML", async () => {
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

Deno.test("SloveniaFifo - testIfiSimpleCsv - 2 rows with correct quantities", () => {
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

Deno.test("SloveniaFifo - testIfiSimpleXml - 1 purchase and 1 sale in XML", async () => {
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
