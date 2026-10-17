import { Scenario } from "@brrr/__tests__/support/Scenario";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";

const { build } = Scenario;

const config = Scenario.config.report(2023, TaxAuthorityLotMatchingMethod.NONE);
const identifier = new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" });

// Paid in USD at 0.5 EUR per USD.
const usd = {
	underlyingCurrency: "USD",
	commissionCurrency: "USD",
	taxCurrency: "USD",
	fxRateToBase: 0.5,
};

test("dividends add up per action, then per day, and are rounded at the end", async () => {
	const lines = await new DivReportGenerator(new PredefinedInfoProvider()).convert(config, [
		build.grouping({
			identifier,
			cashTransactions: [
				// Action A pays twice. Only its first payment's own tax counts; the withholdings add to it.
				build.dividend({
					actionId: "A",
					date: "2023-06-07",
					amount: 10,
					money: {
						underlyingCurrency: "USD",
						commissionCurrency: "USD",
						taxCurrency: "USD",
						taxTotal: 0.5,
						fxRateToBase: 0.5,
					},
				}),
				build.dividend({
					actionId: "A",
					date: "2023-06-07",
					amount: 2.5,
					money: {
						underlyingCurrency: "USD",
						commissionCurrency: "USD",
						taxCurrency: "USD",
						taxTotal: 0.7,
						fxRateToBase: 0.5,
					},
				}),
				build.withholdingTax({ actionId: "A", date: "2023-06-07", amount: -1.5, money: usd }),
				build.withholdingTax({ actionId: "A", date: "2023-06-07", amount: -0.25, money: usd }),
				// Action B is paid on the same day, so it joins A's line.
				build.dividend({ actionId: "B", date: "2023-06-07", amount: 1, money: usd }),
				build.dividend({ actionId: "C", date: "2023-06-08", amount: 4.444, money: usd }),
			],
		}),
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
			build.grouping({
				identifier,
				cashTransactions: [
					build.dividend({ actionId: "A", date: "2023-06-07", amount: 10, money: usd }),
					build.withholdingTax({ actionId: "B", date: "2023-06-07", amount: -1.5, money: usd }),
				],
			}),
		]),
	).rejects.toThrow("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
});
