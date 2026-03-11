import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import { GenericAssetClass, GenericShortLong, GenericTradeReportItemGainType } from "@brrr/Core/Schemas/CommonFormats.ts";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";
import { TaxLot, type TaxLotStock } from "@brrr/Core/Schemas/Lots.ts";
import { ProvidedLotMatchingMethod } from "@brrr/Core/LotMatching/ProvidedLotMatchingMethod.ts";

function makeDate(iso: string): ValidDateTime {
	return DateTime.fromISO(iso) as ValidDateTime;
}

const identifier = new FinancialIdentifier({ isin: "ISIN", ticker: "TICKER", name: "NAME" });

function makeMonetary(qty: number) {
	return {
		underlyingCurrency: "EUR",
		underlyingQuantity: qty,
		underlyingTradePrice: 1,
		comissionCurrency: "EUR",
		comissionTotal: 0,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	};
}

const simpleLot: TaxLotStock = new TaxLot({
	id: "ID",
	financialIdentifier: identifier,
	quantity: 1,
	acquired: new TradeEventStockAcquired({
		id: "ID",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(1),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	}),
	sold: new TradeEventStockSold({
		id: "ID2",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-02"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-1),
		provenance: [],
	}),
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

const underUtilizedLot: TaxLotStock = new TaxLot({
	id: "ID",
	financialIdentifier: identifier,
	quantity: 1,
	acquired: new TradeEventStockAcquired({
		id: "ID",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-01"),
		multiplier: 1,
		exchangedMoney: makeMonetary(2),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	}),
	sold: new TradeEventStockSold({
		id: "ID2",
		financialIdentifier: identifier,
		assetClass: GenericAssetClass.STOCK,
		date: makeDate("2023-01-02"),
		multiplier: 1,
		exchangedMoney: makeMonetary(-2),
		provenance: [],
	}),
	shortLongType: GenericShortLong.LONG,
	provenance: [],
});

Deno.test("simple single lot generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot]);
	const lots = method.performMatching([]);

	assertEquals(lots.length, 1);
	assertEquals(lots[0].quantity, 1);
	assertEquals(lots[0].acquired.relation.date, simpleLot.acquired.date);
	assertEquals(lots[0].sold.relation.date, simpleLot.sold.date);
});

Deno.test("simple single lot and trade generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot]);
	const lots = method.performMatching([]);
	const trades = method.generateTradesFromLotsWithTracking(lots);

	assertEquals(trades.length, 2);
	assertEquals(trades[0].id, simpleLot.acquired.id);
	assertEquals(trades[1].id, simpleLot.sold.id);
	assertEquals(trades[0].quantity, simpleLot.quantity);
	assertEquals(trades[1].quantity, -simpleLot.quantity);
});

Deno.test("under-utilized lot and trade generation", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot]);
	const lots = method.performMatching([]);
	assertEquals(lots.length, 1);

	const trades = method.generateTradesFromLotsWithTracking(lots);
	assertEquals(trades.length, 2);
	assertEquals(trades[0].id, underUtilizedLot.acquired.id);
	assertEquals(trades[1].id, underUtilizedLot.sold.id);
	assertEquals(trades[0].quantity, underUtilizedLot.quantity);
	assertEquals(trades[1].quantity, -underUtilizedLot.quantity);
});

Deno.test("fully utilized trades from under-utilized lots", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot, underUtilizedLot]);
	const lots = method.performMatching([]);
	assertEquals(lots.length, 2);

	const trades = method.generateTradesFromLotsWithTracking(lots);
	assertEquals(trades.length, 2);
	assertEquals(trades[0].id, underUtilizedLot.acquired.id);
	assertEquals(trades[1].id, underUtilizedLot.sold.id);
	assertEquals(trades[0].quantity, underUtilizedLot.acquired.exchangedMoney.underlyingQuantity);
	assertEquals(trades[1].quantity, underUtilizedLot.sold.exchangedMoney.underlyingQuantity);
});
