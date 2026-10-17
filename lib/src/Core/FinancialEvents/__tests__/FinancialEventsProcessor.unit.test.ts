import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import { GenericCategory, GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";

const { build, pipeline } = Scenario;

const identifier = new FinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });

const stockBought = build.stockBought({
	id: "StockBought",
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const stockSold = build.stockSold({
	id: "StockSold",
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: "EUR",
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const grouping = build.grouping({
	identifier,
	countryOfOrigin: "US",
	category: GenericCategory.REGULAR,
	stockTrades: [stockBought, stockSold],
	stockTaxLots: [
		build.stockTaxLot({
			id: "Lot",
			quantity: 1,
			shortLongType: GenericShortLong.LONG,
			acquired: stockBought,
			sold: stockSold,
		}),
	],
	derivativeGroupings: [],
	cashTransactions: [],
});

test("single stock lot matching", () => {
	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			grouping,
			new ProvidedLotMatchingMethod(grouping.stockTaxLots),
			build.date("2023-01-01"),
			build.date("2023-01-02"),
		);

	expect(legs.length).toEqual(2);
});

test("simple filtering trades of lots closed in period", () => {
	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			grouping,
			new ProvidedLotMatchingMethod(grouping.stockTaxLots),
			build.date("2022-01-01"),
			build.date("2022-01-02"),
		);

	expect(legs.length).toEqual(0);
});

test("no stock trades matching when no lots", () => {
	const groupingNoLots = build.grouping({
		identifier,
		countryOfOrigin: "US",
		category: GenericCategory.REGULAR,
		stockTrades: [stockBought, stockSold],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});

	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			groupingNoLots,
			new ProvidedLotMatchingMethod(groupingNoLots.stockTaxLots),
			build.date("2023-01-01"),
			build.date("2023-01-02"),
		);

	expect(legs.length).toEqual(0);
});
