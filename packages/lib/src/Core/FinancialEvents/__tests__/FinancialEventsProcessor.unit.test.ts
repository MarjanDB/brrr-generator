import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import { Category, ShortLong } from "@brrr/Core/Schemas/CommonFormats";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import {
	CountryCode,
	CurrencyCode,
	Isin,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Schemas/Identifiers";

const { build, pipeline } = Scenario;

const identifier = new FinancialIdentifier({
	isin: Isin.Schema.parse("US123"),
	ticker: Ticker.Schema.parse("AAPL"),
	name: "AAPL",
});

const stockBought = build.stockBought({
	id: TradeEventId.Schema.parse("StockBought"),
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const stockSold = build.stockSold({
	id: TradeEventId.Schema.parse("StockSold"),
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const grouping = build.grouping({
	identifier,
	countryOfOrigin: CountryCode.Schema.parse("US"),
	category: Category.REGULAR,
	stockTrades: [stockBought, stockSold],
	stockTaxLots: [
		build.stockTaxLot({
			id: TaxLotId.Schema.parse("Lot"),
			quantity: 1,
			shortLongType: ShortLong.LONG,
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
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
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
