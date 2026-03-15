import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod";
import {
	GenericAssetClass,
	GenericCategory,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration";
import { TaxLot } from "@brrr/Core/Schemas/Lots";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

const identifier = new FinancialIdentifier({ isin: "US123", ticker: "AAPL", name: "AAPL" });

function makeMonetary(qty: number, price: number) {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: qty,
		underlyingTradePrice: price,
		comissionCurrency: "EUR",
		comissionTotal: 0,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

const simpleStockBuy = new TradeEventStockAcquired({
	id: "StockBought",
	financialIdentifier: identifier,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-01"),
	multiplier: 1,
	acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	exchangedMoney: makeMonetary(1, 10),
	provenance: [],
});

const simpleStockSold = new TradeEventStockSold({
	id: "StockSold",
	financialIdentifier: identifier,
	assetClass: GenericAssetClass.STOCK,
	date: makeDate("2023-01-02"),
	multiplier: 1,
	exchangedMoney: makeMonetary(-1, 15),
	provenance: [],
});

const simpleStockLot = new TaxLot({
	id: "Lot",
	financialIdentifier: identifier,
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

function matchingMethodFactory(g: FinancialGrouping) {
	return new ProvidedLotMatchingMethod(g.stockTaxLots) as unknown as ReturnType<
		LotMatchingConfiguration["forStocks"]
	>;
}

test("single stock lot matching", () => {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2023-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([grouping], config);
	expect(interesting.length).toEqual(1);
	expect(interesting[0].stockTrades.length).toEqual(2);
	expect(interesting[0].derivativeGroupings.length).toEqual(0);
});

test("simple filtering trades of lots closed in period", () => {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2022-01-01"),
		toDate: makeDate("2022-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([grouping], config);
	expect(interesting.length).toEqual(1);
	expect(interesting[0].stockTrades.length).toEqual(0);
});

test("no stock trades matching when no lots", () => {
	const groupingNoLots = grouping.copy({ stockTaxLots: [] });
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2023-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([groupingNoLots], config);
	expect(interesting.length).toEqual(1);
	expect(interesting[0].stockTrades.length).toEqual(0);
	expect(interesting[0].derivativeGroupings.length).toEqual(0);
});
