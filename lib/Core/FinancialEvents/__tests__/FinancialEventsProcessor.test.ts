import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod.ts";
import {
	GenericAssetClass,
	GenericCategory,
	GenericMonetaryExchangeInformation,
	GenericShortLong,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type { LotMatchingConfiguration } from "@brrr/Core/Schemas/LotMatchingConfiguration.ts";
import { TaxLot } from "@brrr/Core/Schemas/Lots.ts";
import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";

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
	return new ProvidedLotMatchingMethod(g.stockTaxLots) as unknown as ReturnType<LotMatchingConfiguration["forStocks"]>;
}

Deno.test("single stock lot matching", () => {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2023-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([grouping], config);
	assertEquals(interesting.length, 1);
	assertEquals(interesting[0].stockTrades.length, 2);
	assertEquals(interesting[0].derivativeGroupings.length, 0);
});

Deno.test("simple filtering trades of lots closed in period", () => {
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2022-01-01"),
		toDate: makeDate("2022-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([grouping], config);
	assertEquals(interesting.length, 1);
	assertEquals(interesting[0].stockTrades.length, 0);
});

Deno.test("no stock trades matching when no lots", () => {
	const groupingNoLots = grouping.copy({ stockTaxLots: [] });
	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const config: LotMatchingConfiguration = {
		fromDate: makeDate("2023-01-01"),
		toDate: makeDate("2023-01-02"),
		forStocks: matchingMethodFactory,
		forDerivatives: matchingMethodFactory,
	};
	const interesting = processor.generateInterestingUnderlyingGroupings([groupingNoLots], config);
	assertEquals(interesting.length, 1);
	assertEquals(interesting[0].stockTrades.length, 0);
	assertEquals(interesting[0].derivativeGroupings.length, 0);
});
