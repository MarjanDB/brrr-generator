import { makeMoney } from "@brrr/__tests__/support/Builders";
import {
	GenericAssetClass,
	GenericCategory,
	GenericDividendType,
	type GenericMonetaryExchangeInformation,
} from "@brrr/Core/Schemas/CommonFormats";
import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionWithholdingTax,
	type TransactionCash,
} from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import {
	type TaxAuthorityConfiguration,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { zDateTimeFromISOString } from "@brrr/Utils/DateTime";

const identifier = new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" });

const config: TaxAuthorityConfiguration = {
	fromDate: zDateTimeFromISOString.parse("2023-01-01"),
	toDate: zDateTimeFromISOString.parse("2024-01-01"),
	lotMatchingMethod: TaxAuthorityLotMatchingMethod.NONE,
};

function money(amount: number, taxTotal = 0): GenericMonetaryExchangeInformation {
	return makeMoney({
		underlyingCurrency: "USD",
		underlyingTradePrice: amount,
		commissionCurrency: "USD",
		taxCurrency: "USD",
		taxTotal,
		fxRateToBase: 0.5,
	});
}

function dividend(
	actionId: string,
	date: string,
	amount: number,
	taxTotal = 0,
): TradeEventCashTransactionDividend {
	return new TradeEventCashTransactionDividend({
		id: `${actionId}-${amount}`,
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: zDateTimeFromISOString.parse(date),
		multiplier: 1,
		exchangedMoney: money(amount, taxTotal),
		actionId,
		transactionId: `${actionId}-${amount}`,
		listingExchange: "EXH",
		dividendType: GenericDividendType.ORDINARY,
		provenance: [],
	});
}

function withholding(
	actionId: string,
	date: string,
	amount: number,
): TradeEventCashTransactionWithholdingTax {
	return new TradeEventCashTransactionWithholdingTax({
		id: `${actionId}-${amount}`,
		assetClass: GenericAssetClass.CASH_AND_CASH_EQUIVALENTS,
		date: zDateTimeFromISOString.parse(date),
		multiplier: 1,
		exchangedMoney: money(amount),
		actionId,
		transactionId: `${actionId}-${amount}`,
		listingExchange: "EXH",
		provenance: [],
	});
}

function grouping(cashTransactions: TransactionCash[]): FinancialGrouping {
	return new FinancialGrouping({
		financialIdentifier: identifier,
		countryOfOrigin: null,
		underlyingCategory: GenericCategory.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions,
		provenance: [],
	});
}

test("dividends add up per action, then per day, and are rounded at the end", async () => {
	const lines = await new DivReportGenerator(new PredefinedInfoProvider()).convert(config, [
		grouping([
			// Action A pays twice. Only its first payment's own tax counts; the withholdings add to it.
			dividend("A", "2023-06-07", 10, 0.5),
			dividend("A", "2023-06-07", 2.5, 0.7),
			withholding("A", "2023-06-07", -1.5),
			withholding("A", "2023-06-07", -0.25),
			// Action B is paid on the same day, so it joins A's line.
			dividend("B", "2023-06-07", 1),
			dividend("C", "2023-06-08", 4.444),
		]),
	]);

	expect(
		lines.map((line) => ({
			date: line.dateReceived.toISODate(),
			tracking: line.dividendIdentifierForTracking,
			isin: line.dividendPayerIdentificationNumber,
			dividendAmount: line.dividendAmount,
			dividendAmountInOriginalCurrency: line.dividendAmountInOriginalCurrency,
			foreignTaxPaid: line.foreignTaxPaid,
			foreignTaxPaidInOriginalCurrency: line.foreignTaxPaidInOriginalCurrency,
		})),
	).toEqual([
		{
			date: "2023-06-07",
			tracking: "A-B",
			isin: "ISIN",
			dividendAmount: 13.5,
			dividendAmountInOriginalCurrency: 27,
			foreignTaxPaid: 1.25,
			foreignTaxPaidInOriginalCurrency: 2.5,
		},
		{
			date: "2023-06-08",
			tracking: "C",
			isin: "ISIN",
			dividendAmount: 4.44,
			dividendAmountInOriginalCurrency: 8.89,
			foreignTaxPaid: 0,
			foreignTaxPaidInOriginalCurrency: 0,
		},
	]);
});

test("a withholding without a dividend of the same action is rejected", async () => {
	await expect(
		new DivReportGenerator(new PredefinedInfoProvider()).convert(config, [
			grouping([dividend("A", "2023-06-07", 10), withholding("B", "2023-06-07", -1.5)]),
		]),
	).rejects.toThrow("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
});
