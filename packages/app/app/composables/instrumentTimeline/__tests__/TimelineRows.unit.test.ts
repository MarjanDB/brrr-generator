import { DropReason, ProvenanceEventKind, ProvenanceStage, ProvenanceWalker } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { TimelineGeometry } from "~/composables/instrumentTimeline/timelineGeometry";
import { Timelines } from "~/composables/instrumentTimeline/timelines";
import { TimelineRowKind } from "~/types/timeline";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

const stage = ProvenanceStage.Schema.parse("Test");

// Two lots closed in 2023, one closed in 2024 (on the form), and two buys with shares still open.
function twoYears(): GraphBuilder {
	const b = new GraphBuilder();
	const file = b.file({ name: "U1.xml" });
	const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
	const firstBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2023-01-10",
		quantity: "4",
		price: "5",
		currency: "USD",
		label: "first buy",
	});
	const secondBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2023-02-10",
		quantity: "3",
		price: "5",
		currency: "USD",
		label: "second buy",
	});
	const firstSale = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.SOLD,
		date: "2023-03-10",
		quantity: "-4",
		price: "6",
		currency: "USD",
		label: "first sale",
	});
	const secondSale = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.SOLD,
		date: "2023-06-10",
		quantity: "-3",
		price: "6",
		currency: "USD",
		label: "second sale",
	});
	const first = b.matchClosed({
		instrument: acme,
		acquired: firstBuy,
		sold: firstSale,
		quantity: "4",
	});
	b.graph.drop(first.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	b.graph.drop(first.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	const second = b.matchClosed({
		instrument: acme,
		acquired: secondBuy,
		sold: secondSale,
		quantity: "3",
	});
	b.graph.drop(second.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	b.graph.drop(second.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	const thirdBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2024-01-10",
		quantity: "10",
		price: "5",
		currency: "USD",
		label: "third buy",
	});
	const thirdSale = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.SOLD,
		date: "2024-03-10",
		quantity: "-6",
		price: "7",
		currency: "USD",
		label: "third sale",
	});
	b.match({
		instrument: acme,
		acquired: thirdBuy,
		sold: thirdSale,
		quantity: "6",
		boughtOn: "2024-01-10",
		soldOn: "2024-03-10",
	});
	const lastBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2024-05-01",
		quantity: "5",
		price: "8",
		currency: "USD",
		label: "last buy",
	});
	b.graph.drop(lastBuy.event, DropReason.POSITION_OPEN, stage, null);
	return b;
}

describe("the rows of an instrument's timeline", () => {
	test("folded, each lot on the form has a row, then the lots closed in other years share one, and what is still open another", () => {
		const b = twoYears();
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const rows = TimelineGeometry.rows(timeline.bars, false);

		expect(timeline.bars).toHaveLength(5);
		expect(rows).toHaveLength(3);
		expect(rows[0]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[0]?.bars).toEqual([timeline.bars[2]]);
		expect(rows[1]?.kind).toEqual(TimelineRowKind.OTHER_YEARS);
		expect(rows[1]?.bars).toEqual([timeline.bars[0], timeline.bars[1]]);
		expect(rows[2]?.kind).toEqual(TimelineRowKind.STILL_OPEN);
		expect(rows[2]?.bars).toEqual([timeline.bars[3], timeline.bars[4]]);
		expect(TimelineGeometry.isFoldable(timeline.bars)).toEqual(true);
	});

	test("spread, every bar has a row of its own, in the order they opened", () => {
		const b = twoYears();
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const rows = TimelineGeometry.rows(timeline.bars, true);

		expect(rows).toHaveLength(5);
		expect(rows[0]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[0]?.bars).toEqual([timeline.bars[0]]);
		expect(rows[1]?.bars).toEqual([timeline.bars[1]]);
		expect(rows[2]?.bars).toEqual([timeline.bars[2]]);
		expect(rows[3]?.bars).toEqual([timeline.bars[3]]);
		expect(rows[4]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[4]?.bars).toEqual([timeline.bars[4]]);
	});

	test("one lot from another year and one open position keep rows of their own, and there is nothing to fold", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const oldBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "5",
			currency: "USD",
			label: "old buy",
		});
		const oldSale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-4",
			price: "6",
			currency: "USD",
			label: "old sale",
		});
		const old = b.matchClosed({ instrument: acme, acquired: oldBuy, sold: oldSale, quantity: "4" });
		b.graph.drop(old.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(old.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-6",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "6",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const rows = TimelineGeometry.rows(timeline.bars, false);

		expect(timeline.bars).toHaveLength(3);
		expect(rows).toHaveLength(3);
		expect(rows[0]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[0]?.bars).toEqual([timeline.bars[1]]);
		expect(rows[1]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[1]?.bars).toEqual([timeline.bars[0]]);
		expect(rows[2]?.kind).toEqual(TimelineRowKind.BAR);
		expect(rows[2]?.bars).toEqual([timeline.bars[2]]);
		expect(TimelineGeometry.isFoldable(timeline.bars)).toEqual(false);
	});
});
