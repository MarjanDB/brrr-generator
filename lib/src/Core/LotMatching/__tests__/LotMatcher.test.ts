import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import type { Lot } from "@brrr/Core/LotMatching/Lot";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { LotMatchingMethod } from "@brrr/Core/LotMatching/LotMatchingMethod";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import {
	GenericAssetClass,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats";
import { TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { zDateTimeFromISOString } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

class FakeLotMatchingMethod implements LotMatchingMethod {
	performMatchingCalled = false;
	generateTradesCalled = false;

	performMatching(_events: Trade[]): Lot[] {
		this.performMatchingCalled = true;
		return [];
	}

	generateTradesFromLotsWithTracking(_lots: Lot[]): Trade[] {
		this.generateTradesCalled = true;
		return [];
	}
}

test("provided method is called", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const lotMatcher = new LotMatcher();

	lotMatcher.matchLotsWithTrades(fakeMethod, [
		{ id: "ID", quantity: 1, date: DateTime.fromISO("2023-01-01") as ValidDateTime },
	]);

	expect(fakeMethod.performMatchingCalled).toEqual(true);
	expect(fakeMethod.generateTradesCalled).toEqual(true);
});

function money(quantity: number, commission: number): GenericMonetaryExchangeInformation {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: quantity,
		underlyingTradePrice: 1,
		comissionCurrency: "EUR",
		comissionTotal: commission,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

test("a matched lot's legs point at the original trades and cover the lot's quantity", () => {
	const bought = new TradeEventStockAcquired({
		id: "BUY",
		assetClass: GenericAssetClass.STOCK,
		date: zDateTimeFromISOString.parse("2023-01-01"),
		multiplier: 1,
		exchangedMoney: money(10, -2),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	});
	const sold = new TradeEventStockSold({
		id: "SELL",
		assetClass: GenericAssetClass.STOCK,
		date: zDateTimeFromISOString.parse("2023-02-01"),
		multiplier: 1,
		exchangedMoney: money(-4, -1),
		provenance: [],
	});

	const lots = new LotMatcher().matchLots(new FifoLotMatchingMethod(), [bought, sold]);

	expect(lots).toHaveLength(1);
	const [lot] = lots;
	expect(lot.acquired.trade).toBe(bought);
	expect(lot.acquired.quantity).toBe(4);
	expect(lot.acquired.commission).toBeCloseTo(-0.8);
	expect(lot.sold.trade).toBe(sold);
	expect(lot.sold.quantity).toBe(-4);
	expect(lot.sold.commission).toBe(-1);
});
