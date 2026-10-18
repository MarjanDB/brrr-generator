import { Scenario } from "@brrr/__tests__/support/Scenario";
import type { ILotMatchingMethod } from "@brrr/Core/Interfaces/ILotMatchingMethod";
import { CurrencyCode, TradeEventId } from "@brrr/Core/Models/Identifiers";
import type { Lot } from "@brrr/Core/Models/LotMatching/Lot";
import type { Trade } from "@brrr/Core/Models/LotMatching/Trade";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { LotMatcher } from "@brrr/Core/Services/LotMatching/LotMatcher";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

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

test("matching records the matched lot from both trades, and a leg per side", () => {
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
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(bought, ProvenanceNodeKind.EVENT, "stock bought BUY · 10 EDF", {});
	graph.node(sold, ProvenanceNodeKind.EVENT, "stock sold SELL · -4 EDF", {});

	const [matched] = new LotMatcher().matchLots(new FifoLotMatchingMethod(), [bought, sold], graph);

	const walker = new ProvenanceWalker(graph);
	const acquiredLeg = graph.nodeOf(matched.acquired);
	expect(acquiredLeg.kind).toEqual(ProvenanceNodeKind.LEG);
	expect(acquiredLeg.label).toEqual("leg BUY · 4");
	expect(graph.nodeOf(matched.sold).label).toEqual("leg SELL · -4");
	const lotNode = walker.parents(acquiredLeg)[0].from;
	expect(lotNode.kind).toEqual(ProvenanceNodeKind.MATCHED_LOT);
	expect(lotNode.label).toEqual("matched lot BUY → SELL · 4");
	const lotParents = walker.parents(lotNode);
	expect(lotParents).toHaveLength(2);
	expect(lotParents[0].from).toBe(graph.nodeOf(bought));
	expect(lotParents[0].change).toEqual(ProvenanceChange.MATCHED);
	expect(lotParents[0].by).toEqual("LotMatcher");
	expect(lotParents[1].from).toBe(graph.nodeOf(sold));
	expect(walker.children(lotNode)).toHaveLength(2);
});
