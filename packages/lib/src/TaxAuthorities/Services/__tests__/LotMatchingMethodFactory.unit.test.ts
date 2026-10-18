import { Scenario } from "@brrr/__tests__/support/Scenario";
import { CurrencyCode, TaxLotId, TradeEventId } from "@brrr/Core/Models/Identifiers";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { createLotMatchingMethod } from "@brrr/TaxAuthorities/Services/LotMatchingMethodFactory";

const { build } = Scenario;

test("PROVIDED uses the broker's lots", () => {
	expect(
		createLotMatchingMethod(
			TaxAuthorityLotMatchingMethod.PROVIDED,
			[],
			new NullProvenanceRecorder(),
		),
	).toBeInstanceOf(ProvidedLotMatchingMethod);
});

test("FIFO matches first in, first out", () => {
	expect(
		createLotMatchingMethod(TaxAuthorityLotMatchingMethod.FIFO, [], new NullProvenanceRecorder()),
	).toBeInstanceOf(FifoLotMatchingMethod);
});

test("NONE falls back to FIFO", () => {
	expect(
		createLotMatchingMethod(TaxAuthorityLotMatchingMethod.NONE, [], new NullProvenanceRecorder()),
	).toBeInstanceOf(FifoLotMatchingMethod);
});

test("under FIFO the broker's lots are recorded as not used", () => {
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

	createLotMatchingMethod(TaxAuthorityLotMatchingMethod.FIFO, [lot], graph);

	expect(graph.drops()).toHaveLength(1);
	expect(graph.drops()[0].node).toBe(graph.nodeOf(lot));
	expect(graph.drops()[0].reason).toEqual(DropReason.NOT_USED);
	expect(graph.drops()[0].by).toEqual("LotMatchingMethodFactory");
	expect(graph.drops()[0].detail?.kind).toEqual(
		ProvenanceDetailKind.LOT_MATCHING_IGNORES_BROKER_LOTS,
	);
	expect(graph.drops()[0].detail?.values[ProvenanceDetailValue.LOT_MATCHING_METHOD]).toEqual(
		"FIFO",
	);
});
