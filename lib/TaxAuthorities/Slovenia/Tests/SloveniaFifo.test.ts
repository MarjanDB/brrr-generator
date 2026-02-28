import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDerivativeReportItemGainType,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import type { DerivativeGrouping, FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events.ts";
import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.ts";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";

function makeProvider(taxPayerInfo: TaxPayerInfo, config: TaxAuthorityConfiguration): SlovenianTaxAuthorityProvider {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	return new SlovenianTaxAuthorityProvider(
		taxPayerInfo,
		config,
		new ApplyIdentifierRelationshipsService(),
		new KdvpReportGenerator(processor),
		new DivReportGenerator(new CompanyLookupProvider(), new CountryLookupProvider()),
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

const derivativeGrouping: DerivativeGrouping = {
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	derivativeTrades: [optionBought, optionSold],
	derivativeTaxLots: [],
	provenance: [],
};

const testGrouping: FinancialGrouping = {
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	countryOfOrigin: null,
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [stockAcquired, stockSold],
	stockTaxLots: [],
	derivativeGroupings: [derivativeGrouping],
	cashTransactions: [],
	provenance: [],
};

const testData: FinancialEvents = {
	groupings: [testGrouping],
	identifierRelationships: [],
};

Deno.test("SloveniaFifo - testKdvpSimpleCsv - 2 rows with correct quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2023-01-01"),
		toDate: DateTime.fromISO("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData);

	assertEquals(rows.length, 2, "Only 2 rows should be present");
	assertEquals((rows[0] as Record<string, unknown>)["quantity"], 1, "The first line should be the buy line");
	assertEquals((rows[1] as Record<string, unknown>)["quantity"], -1, "The second line should be the sell line");
});

Deno.test("SloveniaFifo - testKdvpSimpleXml - 1 purchase and 1 sale in XML", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2023-01-01"),
		toDate: DateTime.fromISO("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const xml = provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.DOH_KDVP, testData);

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	assertEquals(purchaseCount, 1, "There should only be one purchase");
	assertEquals(saleCount, 1, "There should only be one sale");
});

Deno.test("SloveniaFifo - testIfiSimpleCsv - 2 rows with correct quantities", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2023-01-01"),
		toDate: DateTime.fromISO("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.D_IFI, testData);

	assertEquals(rows.length, 2, "Only 2 rows should be present");
	assertEquals((rows[0] as Record<string, unknown>)["quantity"], 1, "The first line should be the buy line");
	assertEquals((rows[1] as Record<string, unknown>)["quantity"], -1, "The second line should be the sell line");
});

Deno.test("SloveniaFifo - testIfiSimpleXml - 1 purchase and 1 sale in XML", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2023-01-01"),
		toDate: DateTime.fromISO("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const xml = provider.generateExportForTaxAuthority(SlovenianTaxAuthorityReportTypes.D_IFI, testData);

	const purchaseCount = (xml.match(/<Purchase>/g) ?? []).length;
	const saleCount = (xml.match(/<Sale>/g) ?? []).length;

	assertEquals(purchaseCount, 1, "There should only be one purchase");
	assertEquals(saleCount, 1, "There should only be one sale");
});
