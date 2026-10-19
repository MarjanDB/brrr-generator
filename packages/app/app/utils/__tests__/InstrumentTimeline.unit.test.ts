import {
	DropReason,
	OptionRight,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { TimelineMarkKind, TimelineWeight } from "~/types/timeline";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { buildTimeline, focusableOf, taxYearSpan } from "~/utils/instrumentTimeline";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the data behind an instrument's timeline", () => {
	test("a sale and its buy are marks on their dates, and their matched lot a bar from the buy to the sale", () => {
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
		const matched = b.match({
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
		expect(timeline.bars).toHaveLength(1);
		expect(timeline.bars[0]?.lot).toBe(b.node(matched.lot));
		expect(timeline.bars[0]?.opened).toBe(timeline.marks[0]);
		expect(timeline.bars[0]?.closed).toBe(timeline.marks[1]);
		expect(timeline.bars[0]?.quantity).toEqual(10);
		expect(timeline.points).toHaveLength(0);
		expect(timeline.first).toEqual(Date.UTC(2024, 0, 10));
		expect(timeline.last).toEqual(Date.UTC(2024, 2, 10));
		expect(timeline.stackDepth).toEqual(0);
	});

	test("a mark that ends no bar, such as a broker lot, is a point under the bars", () => {
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
		expect(timeline.bars).toHaveLength(1);
		expect(timeline.points).toHaveLength(1);
		expect(timeline.points[0]?.mark.kind).toEqual(TimelineMarkKind.BROKER_LOT);
		expect(timeline.points[0]?.mark.at).toEqual(Date.UTC(2024, 0, 10));
		expect(timeline.points[0]?.stack).toEqual(0);
		expect(timeline.stackDepth).toEqual(1);
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
		expect(timeline.bars).toHaveLength(1);
		expect(timeline.bars[0]?.quantity).toEqual(40);
		expect(timeline.points).toHaveLength(1);
		expect(timeline.points[0]?.mark).toBe(timeline.marks[1]);
	});

	test("a dividend payer's dividend and tax are points stacked on their day, and it has no bars", () => {
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
		expect(timeline.points[0]?.mark.kind).toEqual(TimelineMarkKind.DIVIDEND);
		expect(timeline.points[0]?.stack).toEqual(0);
		expect(timeline.points[1]?.mark.kind).toEqual(TimelineMarkKind.TAX);
		expect(timeline.points[1]?.stack).toEqual(1);
		expect(timeline.stackDepth).toEqual(2);
		expect(timeline.bars).toHaveLength(0);
	});

	test("what's left of a buy after its lots is a bar that stays open, as context", () => {
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
			quantity: "-6",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "6",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.bars).toHaveLength(2);
		expect(timeline.bars[0]?.quantity).toEqual(6);
		expect(timeline.bars[1]?.lot).toBeNull();
		expect(timeline.bars[1]?.opened).toBe(timeline.marks[0]);
		expect(timeline.bars[1]?.closed).toBeNull();
		expect(timeline.bars[1]?.quantity).toEqual(4);
		expect(timeline.bars[1]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a buy in no lot is a bar of its whole quantity that stays open", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const zed = b.instrument({ ticker: "ZED", isin: "US0000000009" });
		const buy = b.trade({
			file,
			instrument: zed,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "7",
			currency: "USD",
			label: "buy ZED",
		});
		b.graph.drop(buy.event, DropReason.POSITION_OPEN, stage, null);
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.bars).toHaveLength(1);
		expect(timeline.bars[0]?.opened.node).toBe(b.node(buy.event));
		expect(timeline.bars[0]?.closed).toBeNull();
		expect(timeline.bars[0]?.quantity).toEqual(5);
		expect(timeline.points).toHaveLength(0);
	});

	test("a position opened by a sale, as a written option, runs from the sale to the buy that closed it", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const contract = b.optionContract({
			occSymbol: "ACME  240621P00100000",
			underlyingSymbol: "ACME",
			expiry: "2024-06-21",
			strike: "100",
			right: OptionRight.PUT,
		});
		const sell = b.trade({
			file,
			instrument: contract,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-01-10",
			quantity: "-1",
			price: "3",
			currency: "USD",
			label: "sell ACME put",
		});
		const buy = b.trade({
			file,
			instrument: contract,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-03-10",
			quantity: "1",
			price: "1",
			currency: "USD",
			label: "buy ACME put",
		});
		b.match({
			instrument: contract,
			acquired: buy,
			sold: sell,
			quantity: "1",
			boughtOn: "2024-03-10",
			soldOn: "2024-01-10",
		});
		const [underlying] = b.reading().optionUnderlyings;
		const instrument = underlying?.contracts[0];
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.bars).toHaveLength(1);
		expect(timeline.bars[0]?.opened.node).toBe(b.node(sell.event));
		expect(timeline.bars[0]?.closed?.node).toBe(b.node(buy.event));
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

describe("what an instrument's timeline draws as reported and what as context", () => {
	test("a lot closed in the report's period is reported: its buy, its sale and its bar", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-06-01",
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
			boughtOn: "2023-06-01",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[0]?.node).toBe(b.node(buy.event));
		expect(timeline.marks[0]?.weight).toEqual(TimelineWeight.REPORTED);
		expect(timeline.marks[1]?.node).toBe(b.node(sell.event));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.REPORTED);
		expect(timeline.bars[0]?.weight).toEqual(TimelineWeight.REPORTED);
	});

	test("a lot closed outside the report's period is context: its buy, its sale and its bar", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2022-06-01",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const closed = b.matchClosed({ instrument: acme, acquired: buy, sold: sell, quantity: "10" });
		b.graph.drop(closed.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(closed.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[0]?.node).toBe(b.node(buy.event));
		expect(timeline.marks[0]?.weight).toEqual(TimelineWeight.CONTEXT);
		expect(timeline.marks[1]?.node).toBe(b.node(sell.event));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.CONTEXT);
		expect(timeline.bars[0]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a buy split over a lot closed in the period and a later one is reported, the later lot and its sale context", () => {
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
		const sellNow = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-6",
			price: "6",
			currency: "USD",
			label: "sell ACME in 2024",
		});
		const sellLater = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2025-02-10",
			quantity: "-4",
			price: "7",
			currency: "USD",
			label: "sell ACME in 2025",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sellNow,
			quantity: "6",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const later = b.matchClosed({
			instrument: acme,
			acquired: buy,
			sold: sellLater,
			quantity: "4",
		});
		b.graph.drop(later.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(later.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[0]?.node).toBe(b.node(buy.event));
		expect(timeline.marks[0]?.weight).toEqual(TimelineWeight.REPORTED);
		expect(timeline.marks[1]?.node).toBe(b.node(sellNow.event));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.REPORTED);
		expect(timeline.marks[2]?.node).toBe(b.node(sellLater.event));
		expect(timeline.marks[2]?.weight).toEqual(TimelineWeight.CONTEXT);
		expect(timeline.bars[0]?.quantity).toEqual(6);
		expect(timeline.bars[0]?.weight).toEqual(TimelineWeight.REPORTED);
		expect(timeline.bars[1]?.quantity).toEqual(4);
		expect(timeline.bars[1]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a buy whose position is still open is context", () => {
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
		const open = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-11-04",
			quantity: "3",
			price: "8",
			currency: "USD",
			label: "buy ACME, still held",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		b.graph.drop(open.event, DropReason.POSITION_OPEN, stage, null);
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[2]?.node).toBe(b.node(open.event));
		expect(timeline.marks[2]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a broker lot the lot matching doesn't use is context", () => {
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

		expect(timeline.marks[1]?.node).toBe(b.node(brokerLot));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a corporate action while a reported lot was held is reported", () => {
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

		expect(timeline.marks[1]?.node).toBe(b.node(split.action));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.REPORTED);
	});

	test("a split after a reported lot closed, which scaled the lot's trades, is reported", () => {
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
		const sell = b.trade({
			file,
			instrument: oldAcme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-10",
			quantity: "-4",
			price: "110",
			currency: "USD",
			label: "sell ACME",
		});
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-05-01",
		});
		const rebuiltSell = {};
		b.graph.node(rebuiltSell, ProvenanceNodeKind.EVENT, "sell ACME after split", {
			[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.SOLD,
			[ProvenanceField.DATE]: "2024-02-10",
			[ProvenanceField.QUANTITY]: "-40",
			[ProvenanceField.PRICE]: "11",
			[ProvenanceField.CURRENCY]: "USD",
		});
		b.graph.derive([sell.event, split.action], rebuiltSell, ProvenanceChange.SPLIT, stage, null);
		b.graph.derive([rebuiltSell], acme, ProvenanceChange.GROUPED, stage, null);
		b.graph.derive([oldAcme, split.action], acme, ProvenanceChange.SPLIT, stage, null);
		b.match({
			instrument: acme,
			acquired: { row: buy.row, record: buy.record, staged: buy.staged, event: split.rebuilt },
			sold: { row: sell.row, record: sell.record, staged: sell.staged, event: rebuiltSell },
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-02-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[2]?.node).toBe(b.node(split.action));
		expect(timeline.marks[2]?.weight).toEqual(TimelineWeight.REPORTED);
	});

	test("a rename while a reported lot was held is reported", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const oldAcme = b.instrument({ ticker: "ACM", isin: "US0000000001" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000002" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACM",
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
		const rename = {};
		b.graph.node(rename, ProvenanceNodeKind.CORPORATE_ACTION, "rename ACM to ACME", {
			[ProvenanceField.CORPORATE_ACTION_KIND]: "RENAME",
			[ProvenanceField.DATE]: "2024-02-01",
		});
		b.graph.derive([oldAcme, rename], acme, ProvenanceChange.RENAMED, stage, null);
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

		expect(timeline.marks[1]?.node).toBe(b.node(rename));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.REPORTED);
	});

	test("a corporate action outside every reported lot's holding is context", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const oldAcme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const earlyBuy = b.trade({
			file,
			instrument: oldAcme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "buy ACME in 2023",
		});
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const earlySell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-40",
			price: "11",
			currency: "USD",
			label: "sell ACME in 2023",
		});
		const split = b.split({
			trade: earlyBuy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2023-02-01",
		});
		b.graph.derive([oldAcme, split.action], acme, ProvenanceChange.SPLIT, stage, null);
		const early = b.matchClosed({
			instrument: acme,
			acquired: {
				row: earlyBuy.row,
				record: earlyBuy.record,
				staged: earlyBuy.staged,
				event: split.rebuilt,
			},
			sold: earlySell,
			quantity: "40",
		});
		b.graph.drop(early.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(early.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-02",
			quantity: "10",
			price: "12",
			currency: "USD",
			label: "buy ACME in 2024",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-06-03",
			quantity: "-10",
			price: "13",
			currency: "USD",
			label: "sell ACME in 2024",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-05-02",
			soldOn: "2024-06-03",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[1]?.node).toBe(b.node(split.action));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.CONTEXT);
	});

	test("a dividend paid in the report's period is reported, one paid outside it context", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const earlier = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2023-04-01",
			amount: "18",
			currency: "EUR",
			label: "dividend TTE in 2023",
		});
		const now = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE in 2024",
		});
		b.graph.drop(earlier.event, DropReason.OUTSIDE_PERIOD, stage, null);
		b.sumInto({ instrument: tte, events: [now], dateReceived: "2024-04-01" });
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const timeline = buildTimeline(instrument, new ProvenanceWalker(b.graph));

		expect(timeline.marks[0]?.node).toBe(b.node(earlier.event));
		expect(timeline.marks[0]?.weight).toEqual(TimelineWeight.CONTEXT);
		expect(timeline.marks[1]?.node).toBe(b.node(now.event));
		expect(timeline.marks[1]?.weight).toEqual(TimelineWeight.REPORTED);
	});
});

describe("the tax year behind an instrument's timeline", () => {
	test("a tax year inside the axis spans its first day to the next year's first day", () => {
		const span = taxYearSpan(2024, { min: Date.UTC(2023, 5, 1), max: Date.UTC(2025, 5, 1) });

		expect(span?.from).toEqual(Date.UTC(2024, 0, 1));
		expect(span?.to).toEqual(Date.UTC(2025, 0, 1));
	});

	test("the part of a tax year outside the axis is cut off", () => {
		const span = taxYearSpan(2024, { min: Date.UTC(2024, 2, 1), max: Date.UTC(2024, 8, 1) });

		expect(span?.from).toEqual(Date.UTC(2024, 2, 1));
		expect(span?.to).toEqual(Date.UTC(2024, 8, 1));
	});

	test("a tax year the axis doesn't reach has no span", () => {
		const span = taxYearSpan(2024, { min: Date.UTC(2022, 0, 1), max: Date.UTC(2023, 5, 1) });

		expect(span).toBeNull();
	});
});

describe("what the graph can focus on an instrument's timeline", () => {
	test("every mark and every lot the timeline draws, and no row or line", () => {
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
			quantity: "-6",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "6",
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

		const focusable = focusableOf(timeline);

		expect(focusable.size).toEqual(4);
		expect(focusable.has(b.node(buy.event))).toEqual(true);
		expect(focusable.has(b.node(sell.event))).toEqual(true);
		expect(focusable.has(b.node(match.lot))).toEqual(true);
		expect(focusable.has(b.node(brokerLot))).toEqual(true);
		expect(focusable.has(b.node(buy.row))).toEqual(false);
		expect(focusable.has(b.node(match.soldLine))).toEqual(false);
	});
});
