import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import { GenericAssetClass, GenericCategory, GenericDividendType } from "@brrr/core/schemas/CommonFormats.ts";
import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
} from "@brrr/core/schemas/Events.ts";
import type { FinancialEvents } from "@brrr/core/schemas/FinancialEvents.ts";
import { LotMatcher } from "@brrr/core/lotMatching/LotMatcher.ts";
import { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/core/financialEvents/ApplyIdentifierRelationshipsService.ts";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/infoProviders/InfoLookupProvider.ts";
import { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/taxAuthorities/slovenia/schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/taxAuthorities/slovenia/SlovenianTaxAuthorityProvider.ts";
import { KdvpReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/kdvp/KdvpReportGenerator.ts";
import { DivReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/ifi/IfiReportGenerator.ts";

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
		fxRateToBase: 1,
	},
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
};

const cashTransactionPaymentInLieuOfDividend: TradeEventCashTransactionPaymentInLieuOfDividend = {
	kind: "CashTransactionPaymentInLieuOfDividend",
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: DateTime.fromISO("2023-06-08"),
	multiplier: 1,
	exchangedMoney: {
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: 5.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	},
	actionId: "DivAction2",
	transactionId: "TranId2",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
};

const cashTransactionDividendWithholdingTax: TradeEventCashTransactionWithholdingTax = {
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
		fxRateToBase: 1,
	},
	actionId: "DivAction",
	transactionId: "TranId3",
	listingExchange: "EXH",
	provenance: [],
};

const cashTransactionPaymentInLieuOfDividendWithholdingTax: TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend = {
	kind: "CashTransactionWithholdingTaxForPaymentInLieuOfDividend",
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: DateTime.fromISO("2023-06-08"),
	multiplier: 1,
	exchangedMoney: {
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: -2.5,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	},
	actionId: "DivAction2",
	transactionId: "TranId4",
	listingExchange: "EXH",
	provenance: [],
};

const testGrouping: FinancialGrouping = {
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN" }),
	countryOfOrigin: null,
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [],
	stockTaxLots: [],
	derivativeGroupings: [],
	cashTransactions: [
		cashTransactionDividend,
		cashTransactionPaymentInLieuOfDividend,
		cashTransactionDividendWithholdingTax,
		cashTransactionPaymentInLieuOfDividendWithholdingTax,
	],
	provenance: [],
};

const testData: FinancialEvents = {
	groupings: [testGrouping],
	identifierRelationships: [],
};

Deno.test("PaymentInLieuOfDividend - withholding tax is reported separately from dividend withholding tax", () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2023-01-01"),
		toDate: DateTime.fromISO("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const provider = makeProvider(simpleTaxPayer, config);
	const rows = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.DOH_DIV, testData);

	assertEquals(
		rows.length,
		2,
		"2 rows should be present, as there is one dividend event and one payment in lieu of dividend event",
	);

	assertEquals(rows[0]["Znesek dividend (v EUR)"], 10.0);
	assertEquals(rows[0]["Tuji davek (v EUR)"], 5.0);
	assertEquals(rows[1]["Znesek dividend (v EUR)"], 5.0);
	assertEquals(rows[1]["Tuji davek (v EUR)"], 2.5);
});
