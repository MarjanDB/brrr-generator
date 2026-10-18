import {
	DropReason,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { buildTimeline } from "~/download/timeline/buildTimeline";
import { TimelineMarkKind } from "~/download/timeline/TimelineMarkKind";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the data behind an instrument's timeline", () => {
	test("a sale and its buy are marks on their dates, joined by an arc for the matched lot", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks).toHaveLength(2);
		expect(timeline.marks[0]?.kind).toEqual(TimelineMarkKind.BOUGHT);
		expect(timeline.marks[0]?.at).toEqual(Date.UTC(2024, 0, 10));
		expect(timeline.marks[1]?.kind).toEqual(TimelineMarkKind.SOLD);
		expect(timeline.marks[1]?.at).toEqual(Date.UTC(2024, 2, 10));
		expect(timeline.arcs).toHaveLength(1);
		expect(timeline.arcs[0]?.from).toBe(timeline.marks[0]);
		expect(timeline.arcs[0]?.to).toBe(timeline.marks[1]);
		expect(timeline.arcs[0]?.quantity).toEqual(10);
		expect(timeline.first).toEqual(Date.UTC(2024, 0, 10));
		expect(timeline.last).toEqual(Date.UTC(2024, 2, 10));
		expect(timeline.stackDepth).toEqual(1);
	});

	test("marks on the same day stack, the trade first so the arcs meet it, the broker lot below", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const brokerLot = {};
		b.graph.node(brokerLot, ProvenanceNodeKind.LOT, "lot ACME", {
			[ProvenanceField.ACQUIRED_DATE]: "2024-01-10",
			[ProvenanceField.QUANTITY]: "10",
		});
		b.graph.derive([brokerLot], acme, ProvenanceChange.GROUPED, stage, null);
		b.graph.drop(brokerLot, DropReason.NOT_USED, stage, null);
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks).toHaveLength(3);
		expect(timeline.marks[0]?.kind).toEqual(TimelineMarkKind.BOUGHT);
		expect(timeline.marks[0]?.stack).toEqual(0);
		expect(timeline.marks[1]?.kind).toEqual(TimelineMarkKind.BROKER_LOT);
		expect(timeline.marks[1]?.stack).toEqual(1);
		expect(timeline.marks[2]?.kind).toEqual(TimelineMarkKind.SOLD);
		expect(timeline.marks[2]?.stack).toEqual(0);
		expect(timeline.stackDepth).toEqual(2);
	});

	test("a stock rebuilt by a split has a corporate action mark on the action's date", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const oldAcme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: oldAcme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "buy ACME",
		});
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-40",
			price: "11",
			currency: "USD",
			label: "sell ACME",
		});
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-02-01",
		});
		b.graph.derive([oldAcme, split.action], acme, ProvenanceChange.SPLIT, stage, null);
		b.match({
			instrument: acme,
			acquired: { row: buy.row, record: buy.record, staged: buy.staged, event: split.rebuilt },
			sold: sell,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks).toHaveLength(3);
		expect(timeline.marks[0]?.kind).toEqual(TimelineMarkKind.BOUGHT);
		expect(timeline.marks[1]?.kind).toEqual(TimelineMarkKind.CORPORATE_ACTION);
		expect(timeline.marks[1]?.at).toEqual(Date.UTC(2024, 1, 1));
		expect(timeline.marks[1]?.node).toBe(b.node(split.action));
		expect(timeline.marks[2]?.kind).toEqual(TimelineMarkKind.SOLD);
		expect(timeline.arcs).toHaveLength(1);
		expect(timeline.arcs[0]?.quantity).toEqual(40);
	});

	test("a dividend payer has dividend and tax marks and no arcs", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		const tax = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-01",
			amount: "-3",
			currency: "EUR",
			label: "tax TTE",
		});
		b.sumInto({ instrument: tte, events: [dividend, tax], dateReceived: "2024-04-01" });
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks).toHaveLength(2);
		expect(timeline.marks[0]?.kind).toEqual(TimelineMarkKind.DIVIDEND);
		expect(timeline.marks[0]?.stack).toEqual(0);
		expect(timeline.marks[1]?.kind).toEqual(TimelineMarkKind.TAX);
		expect(timeline.marks[1]?.stack).toEqual(1);
		expect(timeline.arcs).toHaveLength(0);
	});

	test("an event with no date is left off the timeline", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		const undated = {};
		b.graph.node(undated, ProvenanceNodeKind.EVENT, "undated", {
			[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.DIVIDEND,
		});
		b.graph.derive([undated], tte, ProvenanceChange.GROUPED, stage, null);
		b.sumInto({
			instrument: tte,
			events: [dividend, { row: {}, record: {}, staged: {}, event: undated }],
			dateReceived: "2024-04-01",
		});
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks).toHaveLength(1);
		expect(timeline.marks[0]?.node).toBe(b.node(dividend.event));
	});

	test("an instrument with a single day has the same first and last", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.first).toEqual(Date.UTC(2024, 3, 1));
		expect(timeline.last).toEqual(Date.UTC(2024, 3, 1));
		expect(timeline.stackDepth).toEqual(1);
	});
});
