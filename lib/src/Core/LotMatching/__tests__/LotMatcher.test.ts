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
import { zDateTimeFromISOString } from "@brrr/Utils/DateTime";

class FakeLotMatchingMethod implements LotMatchingMethod {
	receivedTrades: Trade[] | null = null;

	performMatching(trades: Trade[]): Lot[] {
		this.receivedTrades = trades;
		return [];
	}
}

function money(quantity: number, commission: number): GenericMonetaryExchangeInformation {
	return new GenericMonetaryExchangeInformation({
		underlyingCurrency: "EUR",
		underlyingQuantity: quantity,
		underlyingTradePrice: 1,
		commissionCurrency: "EUR",
		commissionTotal: commission,
		taxCurrency: "EUR",
		taxTotal: 0,
		fxRateToBase: 1,
	});
}

test("provided method is called with the converted trades", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const lotMatcher = new LotMatcher();
	const date = zDateTimeFromISOString.parse("2023-01-01");
	const event = new TradeEventStockAcquired({
		id: "ID",
		assetClass: GenericAssetClass.STOCK,
		date,
		multiplier: 1,
		exchangedMoney: money(1, 0),
		provenance: [],
		acquiredReason: GenericTradeReportItemGainType.BOUGHT,
	});

	const lots = lotMatcher.matchLots(fakeMethod, [event]);

	expect(fakeMethod.receivedTrades).toEqual([{ id: "ID", quantity: 1, date }]);
	expect(lots).toEqual([]);
});

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
