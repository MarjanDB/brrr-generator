import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";

const { build, pipeline } = Scenario;

const identifier = new FinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });
const stockBought = build.stockBought({ id: "StockBought", date: "2023-01-01", price: 10 });
const stockSold = build.stockSold({ id: "StockSold", date: "2023-01-02", price: 15 });

const grouping = build.grouping({
	identifier,
	countryOfOrigin: "US",
	stockTrades: [stockBought, stockSold],
	stockTaxLots: [build.taxLot({ id: "Lot", acquired: stockBought, sold: stockSold })],
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
		stockTrades: [stockBought, stockSold],
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
