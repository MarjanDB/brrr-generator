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

test("simple single lot generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot]);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation.date).toEqual(simpleLot.acquired.date);
	expect(lots[0].sold.relation.date).toEqual(simpleLot.sold.date);
});

test("simple single lot and trade generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot]);
	const lots = method.performMatching([]);
	const trades = method.generateTradesFromLotsWithTracking(lots);

	expect(trades.length).toEqual(2);
	expect(trades[0].id).toEqual(simpleLot.acquired.id);
	expect(trades[1].id).toEqual(simpleLot.sold.id);
	expect(trades[0].quantity).toEqual(simpleLot.quantity);
	expect(trades[1].quantity).toEqual(-simpleLot.quantity);
});

test("under-utilized lot and trade generation", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot]);
	const lots = method.performMatching([]);
	expect(lots.length).toEqual(1);

	const trades = method.generateTradesFromLotsWithTracking(lots);
	expect(trades.length).toEqual(2);
	expect(trades[0].id).toEqual(underUtilizedLot.acquired.id);
	expect(trades[1].id).toEqual(underUtilizedLot.sold.id);
	expect(trades[0].quantity).toEqual(underUtilizedLot.quantity);
	expect(trades[1].quantity).toEqual(-underUtilizedLot.quantity);
});

test("fully utilized trades from under-utilized lots", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot, underUtilizedLot]);
	const lots = method.performMatching([]);
	expect(lots.length).toEqual(2);

	const trades = method.generateTradesFromLotsWithTracking(lots);
	expect(trades.length).toEqual(2);
	expect(trades[0].id).toEqual(underUtilizedLot.acquired.id);
	expect(trades[1].id).toEqual(underUtilizedLot.sold.id);
	expect(trades[0].quantity).toEqual(underUtilizedLot.acquired.exchangedMoney.underlyingQuantity);
	expect(trades[1].quantity).toEqual(underUtilizedLot.sold.exchangedMoney.underlyingQuantity);
});
