import { Scenario } from "@brrr/__tests__/support/Scenario";
import { GenericCategory, GenericDividendType } from "@brrr/Core/Schemas/CommonFormats";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";

const { build } = Scenario;

const config = Scenario.config.report(2023, TaxAuthorityLotMatchingMethod.NONE);
const identifier = new FinancialIdentifier({ isin: "ISIN", ticker: "Ticker", name: "Name" });

test("dividends add up per action, then per day, and are rounded at the end", async () => {
	const lines = await new DivReportGenerator(new PredefinedInfoProvider()).convert(config, [
		build.grouping({
			identifier,
			countryOfOrigin: null,
			category: GenericCategory.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeGroupings: [],
			cashTransactions: [
				// Action A pays twice. Only its first payment's own tax counts; the withholdings add to it.
				build.dividend({
					id: "A-10",
					date: "2023-06-07",
					amount: 10,
					actionId: "A",
					transactionId: "A-10",
					listingExchange: "EXH",
					dividendType: GenericDividendType.ORDINARY,
					currency: "USD",
					commission: 0,
					tax: 0.5,
					fxRateToBase: 0.5,
				}),
				build.dividend({
					id: "A-2.5",
					date: "2023-06-07",
					amount: 2.5,
					actionId: "A",
					transactionId: "A-2.5",
					listingExchange: "EXH",
					dividendType: GenericDividendType.ORDINARY,
					currency: "USD",
					commission: 0,
					tax: 0.7,
					fxRateToBase: 0.5,
				}),
				build.withholdingTax({
					id: "A--1.5",
					date: "2023-06-07",
					amount: -1.5,
					actionId: "A",
					transactionId: "A--1.5",
					listingExchange: "EXH",
					currency: "USD",
					commission: 0,
					tax: 0,
					fxRateToBase: 0.5,
				}),
				build.withholdingTax({
					id: "A--0.25",
					date: "2023-06-07",
					amount: -0.25,
					actionId: "A",
					transactionId: "A--0.25",
					listingExchange: "EXH",
					currency: "USD",
					commission: 0,
					tax: 0,
					fxRateToBase: 0.5,
				}),
				// Action B is paid on the same day, so it joins A's line.
				build.dividend({
					id: "B-1",
					date: "2023-06-07",
					amount: 1,
					actionId: "B",
					transactionId: "B-1",
					listingExchange: "EXH",
					dividendType: GenericDividendType.ORDINARY,
					currency: "USD",
					commission: 0,
					tax: 0,
					fxRateToBase: 0.5,
				}),
				build.dividend({
					id: "C-4.444",
					date: "2023-06-08",
					amount: 4.444,
					actionId: "C",
					transactionId: "C-4.444",
					listingExchange: "EXH",
					dividendType: GenericDividendType.ORDINARY,
					currency: "USD",
					commission: 0,
					tax: 0,
					fxRateToBase: 0.5,
				}),
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
				countryOfOrigin: null,
				category: GenericCategory.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [
					build.dividend({
						id: "A-10",
						date: "2023-06-07",
						amount: 10,
						actionId: "A",
						transactionId: "A-10",
						listingExchange: "EXH",
						dividendType: GenericDividendType.ORDINARY,
						currency: "USD",
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					build.withholdingTax({
						id: "B--1.5",
						date: "2023-06-07",
						amount: -1.5,
						actionId: "B",
						transactionId: "B--1.5",
						listingExchange: "EXH",
						currency: "USD",
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
				],
			}),
		]),
	).rejects.toThrow("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
});
