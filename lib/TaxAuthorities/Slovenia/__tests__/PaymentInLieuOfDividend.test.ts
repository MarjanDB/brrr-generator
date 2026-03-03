import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
} from "@brrr/Core/Schemas/Events.ts";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { NodeJsonCompanyLookupProvider } from "@brrr/InfoProviders/NodeJsonInfoLookupProvider.ts";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

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
		fxRateToBase: 1,
	}),
	actionId: "DivAction",
	transactionId: "TranId1",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
});

const cashTransactionPaymentInLieuOfDividend = new TradeEventCashTransactionPaymentInLieuOfDividend({
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-08"),
	multiplier: 1,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: 5.0,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	actionId: "DivAction2",
	transactionId: "TranId2",
	listingExchange: "EXH",
	dividendType: GenericDividendType.ORDINARY,
	provenance: [],
});

const cashTransactionDividendWithholdingTax = new TradeEventCashTransactionWithholdingTax({
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
		fxRateToBase: 1,
	}),
	actionId: "DivAction",
	transactionId: "TranId3",
	listingExchange: "EXH",
	provenance: [],
});

const cashTransactionPaymentInLieuOfDividendWithholdingTax = new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend({
	id: "ID",
	financialIdentifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
	assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
	date: makeDate("2023-06-08"),
	multiplier: 1,
	exchangedMoney: new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: 1.0,
		underlyingTradePrice: -2.5,
		comissionCurrency: "EUR",
		comissionTotal: 0.0,
		taxCurrency: "EUR",
		taxTotal: 0.0,
		fxRateToBase: 1,
	}),
	actionId: "DivAction2",
	transactionId: "TranId4",
	listingExchange: "EXH",
	provenance: [],
});

const testGrouping = new FinancialGrouping({
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
});

const testData = new FinancialEvents({
	groupings: [testGrouping],
	identifierRelationships: [],
});

Deno.test("PaymentInLieuOfDividend - withholding tax is reported separately from dividend withholding tax", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const generator = new DivReportGenerator(new NodeJsonCompanyLookupProvider());
	const rows = await generator.convert(config, testData.groupings);

	assertEquals(
		rows.length,
		2,
		"2 rows should be present, as there is one dividend event and one payment in lieu of dividend event",
	);

	assertEquals(rows[0].dividendAmount, 10.0);
	assertEquals(rows[0].foreignTaxPaid, 5.0);
	assertEquals(rows[1].dividendAmount, 5.0);
	assertEquals(rows[1].foreignTaxPaid, 2.5);
});
