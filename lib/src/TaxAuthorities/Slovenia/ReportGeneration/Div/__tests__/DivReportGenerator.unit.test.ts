import { Scenario } from "@brrr/__tests__/support/Scenario";
import type { MoneyFields } from "@brrr/__tests__/support/Values";
import type { TradeEventCashTransactionDividend, TransactionCash } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";

const { build } = Scenario;

const config = Scenario.config.report(2023, TaxAuthorityLotMatchingMethod.NONE);

// Paid in USD at 0.5 EUR per USD.
function usd(taxTotal = 0): MoneyFields {
	return {
		underlyingCurrency: "USD",
		commissionCurrency: "USD",
		taxCurrency: "USD",
		taxTotal,
		fxRateToBase: 0.5,
	};
}

type ActionId = TradeEventCashTransactionDividend["actionId"];

function dividend(actionId: ActionId, date: string, amount: number, taxTotal = 0) {
	return build.dividend({
		id: `${actionId}-${amount}`,
		actionId,
		date,
		amount,
		money: usd(taxTotal),
	});
}

function withholding(actionId: ActionId, date: string, amount: number) {
	return build.withholdingTax({
		id: `${actionId}-${amount}`,
		actionId,
		date,
		amount,
		money: usd(),
	});
}

function grouping(cashTransactions: TransactionCash[]) {
	return build.grouping({
		identifier: new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" }),
		cashTransactions,
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
