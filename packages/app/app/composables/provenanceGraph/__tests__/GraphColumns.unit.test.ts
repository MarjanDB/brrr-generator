import { ProvenanceEventKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphLayouts } from "~/composables/provenanceGraph/graphLayouts";
import { GraphModels } from "~/composables/provenanceGraph/graphModels";
import { GraphHeading, GraphLane } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

describe("the columns, lanes and order of a graph layout", () => {
	test("columns follow the stages and skip the ones with nothing in them", () => {
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
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(match.lot),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(file))?.column).toEqual(0);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.row))?.column).toEqual(1);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.event))?.column).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(match.lot))?.column).toEqual(3);
		expect(GraphLayouts.nodeOf(layout, b.node(buy.row))?.column).toEqual(1);
		expect(layout.columns).toHaveLength(4);
		expect(layout.columns[0]?.headings).toEqual([GraphHeading.EXPORT]);
		expect(layout.columns[1]?.headings).toEqual([GraphHeading.ROW]);
		expect(layout.columns[2]?.headings).toEqual([GraphHeading.TRADE]);
		expect(layout.columns[3]?.headings).toEqual([GraphHeading.REPORT_PAIRS]);
	});

	test("a trade rebuilt by a split takes the next column, and an action off the main path names no heading", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "buy ACME",
		});
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-06-10",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-09-10",
			quantity: "-40",
			price: "12",
			currency: "USD",
			label: "sell ACME",
		});
		const match = b.match({
			instrument: acme,
			acquired: { ...buy, event: split.rebuilt },
			sold: sell,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-09-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(buy.row),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(buy.event))?.column).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(split.action))?.column).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(split.action))?.isStub).toEqual(true);
		expect(GraphLayouts.nodeOf(layout, b.node(split.rebuilt))?.column).toEqual(3);
		expect(GraphLayouts.nodeOf(layout, b.node(match.lot))?.column).toEqual(4);
		expect(layout.columns[2]?.headings).toEqual([GraphHeading.TRADE]);
		expect(layout.columns[3]?.headings).toEqual([GraphHeading.AFTER_CORPORATE_ACTION]);
		expect(layout.columns[4]?.headings).toEqual([GraphHeading.REPORT_PAIRS]);
	});

	test("opening trades are in the top lane, closing trades in the bottom one, the rest between", () => {
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
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(match.lot),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(buy.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.event))?.lane).toEqual(GraphLane.SOLD);
		expect(GraphLayouts.nodeOf(layout, b.node(match.lot))?.lane).toEqual(GraphLane.MIDDLE);
		expect(GraphLayouts.nodeOf(layout, b.node(buy.row))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.row))?.lane).toEqual(GraphLane.SOLD);
		expect(layout.lanes).toEqual([GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD]);
	});

	test("a dividend and its withholding share a column and sit in different lanes", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const payer = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-02",
			amount: "3.5",
			currency: "EUR",
			label: "dividend TTE",
		});
		const tax = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-02",
			amount: "-0.9",
			currency: "EUR",
			label: "tax TTE",
		});
		const sums = b.sumInto({
			instrument: payer,
			events: [dividend, tax],
			dateReceived: "2024-04-02",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(sums.daySum),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(dividend.event))?.column).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(tax.event))?.column).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(dividend.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(GraphLayouts.nodeOf(layout, b.node(tax.event))?.lane).toEqual(GraphLane.SOLD);
		expect(GraphLayouts.nodeOf(layout, b.node(sums.actionSum))?.lane).toEqual(GraphLane.MIDDLE);
		expect(GraphLayouts.nodeOf(layout, b.node(sums.daySum))?.lane).toEqual(GraphLane.MIDDLE);
		expect(GraphLayouts.nodeOf(layout, b.node(sums.line))?.lane).toEqual(GraphLane.MIDDLE);
		expect(layout.columns).toHaveLength(6);
		expect(layout.columns[2]?.headings).toEqual([GraphHeading.DIVIDEND, GraphHeading.TAX]);
		expect(layout.columns[3]?.headings).toEqual([GraphHeading.SUMMED_PER_ACTION]);
		expect(layout.columns[4]?.headings).toEqual([GraphHeading.SUMMED_PER_DAY]);
		expect(layout.columns[5]?.headings).toEqual([GraphHeading.REPORT]);
	});

	test("the lots of one sale are rows in the order of their buys, and each buy shares its lot's row", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const firstBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "first buy",
		});
		const secondBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "second buy",
		});
		const thirdBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-12",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "third buy",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-30",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const firstMatch = b.match({
			instrument: acme,
			acquired: firstBuy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const secondMatch = b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-11",
			soldOn: "2024-03-10",
		});
		const thirdMatch = b.match({
			instrument: acme,
			acquired: thirdBuy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-12",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(firstMatch.lot))?.row).toEqual(0);
		expect(GraphLayouts.nodeOf(layout, b.node(secondMatch.lot))?.row).toEqual(1);
		expect(GraphLayouts.nodeOf(layout, b.node(thirdMatch.lot))?.row).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(firstBuy.event))?.row).toEqual(0);
		expect(GraphLayouts.nodeOf(layout, b.node(secondBuy.event))?.row).toEqual(1);
		expect(GraphLayouts.nodeOf(layout, b.node(thirdBuy.event))?.row).toEqual(2);
		expect(GraphLayouts.nodeOf(layout, b.node(firstBuy.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.event))?.order).toEqual(0);
	});

	test("laying out the same graph twice gives the same order", () => {
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
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const first = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const second = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(second, b.node(file))?.order).toEqual(
			GraphLayouts.nodeOf(first, b.node(file))?.order,
		);
		expect(GraphLayouts.nodeOf(second, b.node(sell.event))?.order).toEqual(
			GraphLayouts.nodeOf(first, b.node(sell.event))?.order,
		);
		expect(GraphLayouts.nodeOf(second, b.node(match.lot))?.order).toEqual(
			GraphLayouts.nodeOf(first, b.node(match.lot))?.order,
		);
	});
});
