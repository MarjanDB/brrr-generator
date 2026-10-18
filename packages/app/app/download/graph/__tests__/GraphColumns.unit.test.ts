import { ProvenanceEventKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { GraphHeading } from "~/download/graph/GraphHeading";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphLane } from "~/download/graph/GraphLane";
import { layoutGraph } from "~/download/graph/layoutGraph";

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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(file))?.column).toEqual(0);
		expect(layout.layoutNodeOf(b.node(sell.row))?.column).toEqual(1);
		expect(layout.layoutNodeOf(b.node(sell.event))?.column).toEqual(2);
		expect(layout.layoutNodeOf(b.node(match.lot))?.column).toEqual(3);
		expect(layout.layoutNodeOf(b.node(buy.row))?.column).toEqual(1);
		expect(layout.columns).toHaveLength(4);
		expect(layout.columns[0]?.headings).toEqual([GraphHeading.EXPORT]);
		expect(layout.columns[1]?.headings).toEqual([GraphHeading.ROW]);
		expect(layout.columns[2]?.headings).toEqual([GraphHeading.TRADE]);
		expect(layout.columns[3]?.headings).toEqual([GraphHeading.REPORT_PAIRS]);
	});

	test("a trade rebuilt by a split takes the next column, and the faded action names no heading", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(buy.event))?.column).toEqual(2);
		expect(layout.layoutNodeOf(b.node(split.action))?.column).toEqual(2);
		expect(layout.layoutNodeOf(b.node(split.action))?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(b.node(split.rebuilt))?.column).toEqual(3);
		expect(layout.layoutNodeOf(b.node(match.lot))?.column).toEqual(4);
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(match.lot), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(buy.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(layout.layoutNodeOf(b.node(sell.event))?.lane).toEqual(GraphLane.SOLD);
		expect(layout.layoutNodeOf(b.node(match.lot))?.lane).toEqual(GraphLane.MIDDLE);
		expect(layout.layoutNodeOf(b.node(buy.row))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(layout.layoutNodeOf(b.node(sell.row))?.lane).toEqual(GraphLane.SOLD);
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(sums.daySum), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(dividend.event))?.column).toEqual(2);
		expect(layout.layoutNodeOf(b.node(tax.event))?.column).toEqual(2);
		expect(layout.layoutNodeOf(b.node(dividend.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(layout.layoutNodeOf(b.node(tax.event))?.lane).toEqual(GraphLane.SOLD);
		expect(layout.layoutNodeOf(b.node(sums.actionSum))?.lane).toEqual(GraphLane.MIDDLE);
		expect(layout.layoutNodeOf(b.node(sums.daySum))?.lane).toEqual(GraphLane.MIDDLE);
		expect(layout.layoutNodeOf(b.node(sums.line))?.lane).toEqual(GraphLane.MIDDLE);
		expect(layout.columns).toHaveLength(6);
		expect(layout.columns[2]?.headings).toEqual([GraphHeading.DIVIDEND, GraphHeading.TAX]);
		expect(layout.columns[3]?.headings).toEqual([GraphHeading.SUMMED_PER_ACTION]);
		expect(layout.columns[4]?.headings).toEqual([GraphHeading.SUMMED_PER_DAY]);
		expect(layout.columns[5]?.headings).toEqual([GraphHeading.REPORT]);
	});

	test("the pairs of one sale keep the order of their buys, and each buy sits beside its pair", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(firstMatch.lot))?.order).toEqual(0);
		expect(layout.layoutNodeOf(b.node(secondMatch.lot))?.order).toEqual(1);
		expect(layout.layoutNodeOf(b.node(thirdMatch.lot))?.order).toEqual(2);
		expect(layout.layoutNodeOf(b.node(firstBuy.event))?.order).toEqual(0);
		expect(layout.layoutNodeOf(b.node(secondBuy.event))?.order).toEqual(1);
		expect(layout.layoutNodeOf(b.node(thirdBuy.event))?.order).toEqual(2);
		expect(layout.layoutNodeOf(b.node(firstBuy.event))?.lane).toEqual(GraphLane.ACQUIRED);
		expect(layout.layoutNodeOf(b.node(sell.event))?.order).toEqual(0);
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const first = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const second = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });

		expect(second.layoutNodeOf(b.node(file))?.order).toEqual(
			first.layoutNodeOf(b.node(file))?.order,
		);
		expect(second.layoutNodeOf(b.node(sell.event))?.order).toEqual(
			first.layoutNodeOf(b.node(sell.event))?.order,
		);
		expect(second.layoutNodeOf(b.node(match.lot))?.order).toEqual(
			first.layoutNodeOf(b.node(match.lot))?.order,
		);
	});
});
