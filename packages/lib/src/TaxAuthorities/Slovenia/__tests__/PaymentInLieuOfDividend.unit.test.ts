import { Scenario } from "@brrr/__tests__/support/Scenario";
import { Category, GenericDividendType } from "@brrr/Core/Schemas/CommonFormats";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";

const { build, config } = Scenario;

const dividend = build.dividend({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-07",
	amount: 10.0,
	actionId: CashActionId.Schema.parse("DivAction"),
	transactionId: CashTransactionId.Schema.parse("TranId1"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	dividendType: GenericDividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const paymentInLieuOfDividend = build.paymentInLieu({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-08",
	amount: 5.0,
	actionId: CashActionId.Schema.parse("DivAction2"),
	transactionId: CashTransactionId.Schema.parse("TranId2"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	dividendType: GenericDividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const dividendWithholdingTax = build.withholdingTax({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-07",
	amount: -5.0,
	actionId: CashActionId.Schema.parse("DivAction"),
	transactionId: CashTransactionId.Schema.parse("TranId3"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const paymentInLieuOfDividendWithholdingTax = build.paymentInLieuWithholdingTax({
	id: TradeEventId.Schema.parse("ID"),
	date: "2023-06-08",
	amount: -2.5,
	actionId: CashActionId.Schema.parse("DivAction2"),
	transactionId: CashTransactionId.Schema.parse("TranId4"),
	listingExchange: ListingExchange.Schema.parse("EXH"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const testData = build.events(
	[
		build.grouping({
			identifier: new FinancialIdentifier({ isin: Isin.Schema.parse("ISIN") }),
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeGroupings: [],
			cashTransactions: [
				dividend,
				paymentInLieuOfDividend,
				dividendWithholdingTax,
				paymentInLieuOfDividendWithholdingTax,
			],
		}),
	],
	[],
);

test("PaymentInLieuOfDividend - withholding tax is reported separately from dividend withholding tax", async () => {
	const generator = new DivReportGenerator(new PredefinedInfoProvider());
	const rows = await generator.convert(
		config.report(2023, TaxAuthorityLotMatchingMethod.NONE),
		testData.groupings,
	);

	expect(rows.length).toEqual(2);

	expect(rows[0].dividendAmount).toEqual(10.0);
	expect(rows[0].foreignTaxPaid).toEqual(5.0);
	expect(rows[1].dividendAmount).toEqual(5.0);
	expect(rows[1].foreignTaxPaid).toEqual(2.5);
});
