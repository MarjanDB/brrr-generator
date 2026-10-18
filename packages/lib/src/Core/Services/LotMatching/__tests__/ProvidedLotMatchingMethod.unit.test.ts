import { Scenario } from "@brrr/__tests__/support/Scenario";
import { CurrencyCode, TaxLotId, TradeEventId } from "@brrr/Core/Models/Identifiers";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

const { build } = Scenario;

const simpleLot = build.stockTaxLot({
	id: TaxLotId.Schema.parse("ID"),
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: build.stockBought({
		id: TradeEventId.Schema.parse("ID"),
		date: "2023-01-01",
		quantity: 1,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
	sold: build.stockSold({
		id: TradeEventId.Schema.parse("ID2"),
		date: "2023-01-02",
		quantity: -1,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
});

// A lot of 1 over a buy and a sale of 2 each.
const underUtilizedLot = build.stockTaxLot({
	id: TaxLotId.Schema.parse("ID"),
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: build.stockBought({
		id: TradeEventId.Schema.parse("ID"),
		date: "2023-01-01",
		quantity: 2,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
	sold: build.stockSold({
		id: TradeEventId.Schema.parse("ID2"),
		date: "2023-01-02",
		quantity: -2,
		price: 1,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	}),
});

test("simple single lot generation", () => {
	const method = new ProvidedLotMatchingMethod([simpleLot], new NullProvenanceRecorder());
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(1);
	expect(lots[0].acquired.relation.date).toEqual(simpleLot.acquired.date);
	expect(lots[0].sold.relation.date).toEqual(simpleLot.sold.date);
});

test("under-utilized lot generation", () => {
	const method = new ProvidedLotMatchingMethod([underUtilizedLot], new NullProvenanceRecorder());
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(1);
	expect(lots[0].quantity).toEqual(underUtilizedLot.quantity);
	expect(lots[0].acquired.relation.id).toEqual(underUtilizedLot.acquired.id);
	expect(lots[0].sold.relation.id).toEqual(underUtilizedLot.sold.id);
});

test("two lots can share the same trades up to their quantity", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);
	const lots = method.performMatching([]);

	expect(lots.length).toEqual(2);
	expect(lots.map((lot) => lot.quantity)).toEqual([1, 1]);
});

test("lots that use more than a trade's quantity throw", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);

	expect(() => method.performMatching([])).toThrow(Error);
});

test("matching twice with the same method gives the same lots", () => {
	const method = new ProvidedLotMatchingMethod(
		[underUtilizedLot, underUtilizedLot],
		new NullProvenanceRecorder(),
	);

	expect(method.performMatching([])).toEqual(method.performMatching([]));
});

test("each lot it returns is recorded as made from the broker's lot", () => {
	const lot = build.stockTaxLot({
		id: TaxLotId.Schema.parse("L1"),
		quantity: 5,
		shortLongType: ShortLong.LONG,
		acquired: build.stockBought({
			id: TradeEventId.Schema.parse("b1"),
			date: "2023-01-01",
			quantity: 5,
			price: 1,
			currency: CurrencyCode.Schema.parse("EUR"),
			commission: 0,
			tax: 0,
			fxRateToBase: 1,
		}),
		sold: build.stockSold({
			id: TradeEventId.Schema.parse("s1"),
			date: "2023-01-02",
			quantity: -5,
			price: 1,
			currency: CurrencyCode.Schema.parse("EUR"),
			commission: 0,
			tax: 0,
			fxRateToBase: 1,
		}),
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(lot, ProvenanceNodeKind.LOT, "lot L1 · 5 EDF", {});

	const [matched] = new ProvidedLotMatchingMethod([lot], graph).performMatching([]);

	const node = graph.nodeOf(matched);
	expect(node.kind).toEqual(ProvenanceNodeKind.MATCHED_LOT);
	expect(node.label).toEqual("matched lot b1 → s1 · 5");
	const parents = new ProvenanceWalker(graph).parents(node);
	expect(parents).toHaveLength(1);
	expect(parents[0].from).toBe(graph.nodeOf(lot));
	expect(parents[0].change).toEqual(ProvenanceChange.MATCHED);
	expect(parents[0].by).toEqual("ProvidedLotMatchingMethod");
});
