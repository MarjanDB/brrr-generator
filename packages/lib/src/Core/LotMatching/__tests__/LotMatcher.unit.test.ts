import { Scenario } from "@brrr/__tests__/support/Scenario";
import { FifoLotMatchingMethod } from "@brrr/Core/LotMatching/FifoLotMatchingMethod";
import type { ILotMatchingMethod } from "@brrr/Core/LotMatching/ILotMatchingMethod";
import type { Lot } from "@brrr/Core/LotMatching/Lot";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import type { Trade } from "@brrr/Core/LotMatching/Trade";
import { CurrencyCode, TradeEventId } from "@brrr/Core/Schemas/Identifiers";

const { build } = Scenario;

class FakeLotMatchingMethod implements ILotMatchingMethod {
	receivedTrades: Trade[] | null = null;

	performMatching(trades: Trade[]): Lot[] {
		this.receivedTrades = trades;
		return [];
	}
}

test("provided method is called with the converted trades", () => {
	const fakeMethod = new FakeLotMatchingMethod();
	const event = build.stockBought({
		id: TradeEventId.Schema.parse("ID"),
		date: "2023-01-01",
		quantity: 1,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});

	const lots = new LotMatcher().matchLots(fakeMethod, [event]);

	expect(fakeMethod.receivedTrades).toEqual([{ id: "ID", quantity: 1, date: event.date }]);
	expect(lots).toEqual([]);
});

test("a matched lot's legs point at the original trades and cover the lot's quantity", () => {
	const bought = build.stockBought({
		id: TradeEventId.Schema.parse("BUY"),
		date: "2023-01-01",
		quantity: 10,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: -2,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = build.stockSold({
		id: TradeEventId.Schema.parse("SELL"),
		date: "2023-02-01",
		quantity: -4,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: -1,
		tax: 0,
		fxRateToBase: 1,
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
