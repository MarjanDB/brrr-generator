import {
	GenericAssetClass,
	GenericCategory,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
} from "@brrr/Core/Schemas/Events";
import { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import { NodeInfoProvider } from "@brrr/InfoProviders/Node/NodeInfoProvider";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

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

test("PaymentInLieuOfDividend - withholding tax is reported separately from dividend withholding tax", async () => {
	const config: TaxAuthorityConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2024-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
	};

	const generator = new DivReportGenerator(new NodeInfoProvider());
	const rows = await generator.convert(config, testData.groupings);

	expect(
		rows.length,
	).toEqual(2);

	expect(rows[0].dividendAmount).toEqual(10.0);
	expect(rows[0].foreignTaxPaid).toEqual(5.0);
	expect(rows[1].dividendAmount).toEqual(5.0);
	expect(rows[1].foreignTaxPaid).toEqual(2.5);
});
