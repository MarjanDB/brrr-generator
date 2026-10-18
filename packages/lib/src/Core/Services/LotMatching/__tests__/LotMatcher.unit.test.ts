import { Scenario } from "@brrr/__tests__/support/Scenario";
import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import { CurrencyCode, TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { Lot } from "@brrr/Core/Models/LotMatching/Lot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { LotMatcher } from "@brrr/Core/Services/LotMatching/LotMatcher";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";

const { build } = Scenario;

class FakeLotMatchingMethod implements ILotMatchingMethod {
	public receivedTrades: Trade[] | null = null;

	public performMatching(trades: Trade[]): Lot[] {
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

	const lots = new LotMatcher().matchLots(fakeMethod, [event], new NullProvenanceRecorder());

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

	const lots = new LotMatcher().matchLots(
		new FifoLotMatchingMethod(),
		[bought, sold],
		new NullProvenanceRecorder(),
	);

	expect(lots).toHaveLength(1);
	const [lot] = lots;
	expect(lot.acquired.trade).toBe(bought);
	expect(lot.acquired.quantity).toBe(4);
	expect(lot.acquired.commission).toBeCloseTo(-0.8);
	expect(lot.sold.trade).toBe(sold);
	expect(lot.sold.quantity).toBe(-4);
	expect(lot.sold.commission).toBe(-1);
});
