import { makeDate, makeMoney } from "@brrr/__tests__/support/Builders";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import {
	GenericAssetClass,
	GenericCategory,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import { TaxLot } from "@brrr/Core/Schemas/Lots";

const identifier = new FinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });

function makeMonetary(qty: number, price: number) {
	return makeMoney({ underlyingQuantity: qty, underlyingTradePrice: price });
}

const simpleStockBuy = new TradeEventStockAcquired({
	id: "StockBought",
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	exchangedMoney: makeMonetary(1, 10),
	provenance: [],
});

const simpleStockSold = new TradeEventStockSold({
	id: "StockSold",
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-02"),
	multiplier: 1,
	exchangedMoney: makeMonetary(-1, 15),
	provenance: [],
});

const simpleStockLot = new TaxLot({
	id: "Lot",
	quantity: 1,
	acquired: simpleStockBuy,
	sold: simpleStockSold,
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const grouping = new FinancialGrouping({
	financialIdentifier: identifier,
	countryOfOrigin: "US",
	underlyingCategory: GenericCategory.REGULAR,
	stockTrades: [simpleStockBuy, simpleStockSold],
	stockTaxLots: [simpleStockLot],
	derivativeGroupings: [],
	cashTransactions: [],
	provenance: [],
});

test("single stock lot matching", () => {
	const processor = new FinancialEventsProcessor(new LotMatcher());

	const legs = processor.stockLotLegsClosedInPeriod(
		grouping,
		new ProvidedLotMatchingMethod(grouping.stockTaxLots),
		makeDate("2023-01-01"),
		makeDate("2023-01-02"),
	);

	expect(legs.length).toEqual(2);
});

test("simple filtering trades of lots closed in period", () => {
	const processor = new FinancialEventsProcessor(new LotMatcher());

	const legs = processor.stockLotLegsClosedInPeriod(
		grouping,
		new ProvidedLotMatchingMethod(grouping.stockTaxLots),
		makeDate("2022-01-01"),
		makeDate("2022-01-02"),
	);

	expect(legs.length).toEqual(0);
});

test("no stock trades matching when no lots", () => {
	const groupingNoLots = new FinancialGrouping({ ...grouping, stockTaxLots: [] });
	const processor = new FinancialEventsProcessor(new LotMatcher());

	const legs = processor.stockLotLegsClosedInPeriod(
		groupingNoLots,
		new ProvidedLotMatchingMethod(groupingNoLots.stockTaxLots),
		makeDate("2023-01-01"),
		makeDate("2023-01-02"),
	);

	expect(legs.length).toEqual(0);
});
