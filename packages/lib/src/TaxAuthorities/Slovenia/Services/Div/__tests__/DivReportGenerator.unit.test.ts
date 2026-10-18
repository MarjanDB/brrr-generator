import { Scenario } from "@brrr/__tests__/support/Scenario";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Div/DivReportGenerator";

const { build } = Scenario;

const config = Scenario.config.report(2023, TaxAuthorityLotMatchingMethod.NONE);
const identifier = new FinancialIdentifier({
	isin: Isin.Schema.parse("ISIN"),
	ticker: Ticker.Schema.parse("Ticker"),
	name: "Name",
});

test("dividends add up per action, then per day, and are rounded at the end", async () => {
	const lines = await new DivReportGenerator(new PredefinedInfoProvider()).convert(
		config,
		[
			build.grouping({
				identifier,
				countryOfOrigin: null,
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [
					// Action A pays twice. Only its first payment's own tax counts; the withholdings add to it.
					build.dividend({
						id: TradeEventId.Schema.parse("A-10"),
						date: "2023-06-07",
						amount: 10,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A-10"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0.5,
						fxRateToBase: 0.5,
					}),
					build.dividend({
						id: TradeEventId.Schema.parse("A-2.5"),
						date: "2023-06-07",
						amount: 2.5,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A-2.5"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0.7,
						fxRateToBase: 0.5,
					}),
					build.withholdingTax({
						id: TradeEventId.Schema.parse("A--1.5"),
						date: "2023-06-07",
						amount: -1.5,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A--1.5"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					build.withholdingTax({
						id: TradeEventId.Schema.parse("A--0.25"),
						date: "2023-06-07",
						amount: -0.25,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A--0.25"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					// Action B is paid on the same day, so it joins A's line.
					build.dividend({
						id: TradeEventId.Schema.parse("B-1"),
						date: "2023-06-07",
						amount: 1,
						actionId: CashActionId.Schema.parse("B"),
						transactionId: CashTransactionId.Schema.parse("B-1"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					build.dividend({
						id: TradeEventId.Schema.parse("C-4.444"),
						date: "2023-06-08",
						amount: 4.444,
						actionId: CashActionId.Schema.parse("C"),
						transactionId: CashTransactionId.Schema.parse("C-4.444"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
				],
			}),
		],
		new NullProvenanceRecorder(),
	);

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
		new DivReportGenerator(new PredefinedInfoProvider()).convert(
			config,
			[
				build.grouping({
					identifier,
					countryOfOrigin: null,
					category: Category.REGULAR,
					stockTrades: [],
					stockTaxLots: [],
					derivativeGroupings: [],
					cashTransactions: [
						build.dividend({
							id: TradeEventId.Schema.parse("A-10"),
							date: "2023-06-07",
							amount: 10,
							actionId: CashActionId.Schema.parse("A"),
							transactionId: CashTransactionId.Schema.parse("A-10"),
							listingExchange: ListingExchange.Schema.parse("EXH"),
							dividendType: DividendType.ORDINARY,
							currency: CurrencyCode.Schema.parse("USD"),
							commission: 0,
							tax: 0,
							fxRateToBase: 0.5,
						}),
						build.withholdingTax({
							id: TradeEventId.Schema.parse("B--1.5"),
							date: "2023-06-07",
							amount: -1.5,
							actionId: CashActionId.Schema.parse("B"),
							transactionId: CashTransactionId.Schema.parse("B--1.5"),
							listingExchange: ListingExchange.Schema.parse("EXH"),
							currency: CurrencyCode.Schema.parse("USD"),
							commission: 0,
							tax: 0,
							fxRateToBase: 0.5,
						}),
					],
				}),
			],
			new NullProvenanceRecorder(),
		),
	).rejects.toThrow("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
});
