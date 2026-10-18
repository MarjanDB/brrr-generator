import { ProvenanceEventKind } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphLane } from "~/download/graph/GraphLane";
import type { GraphMetrics } from "~/download/graph/GraphMetrics";
import { layoutGraph } from "~/download/graph/layoutGraph";
import { placeGraph } from "~/download/graph/placeGraph";

// Round numbers, so every position below can be worked out by hand: a column is 150 wide with its
// gap, a pair card is 20 + 2 * 20 = 60 tall.
const metrics: GraphMetrics = {
	nodeWidth: 100,
	nodeHeight: 40,
	pairHeaderHeight: 20,
	pairRowHeight: 20,
	columnGap: 50,
	rowGap: 10,
	bandGap: 30,
	left: 0,
	top: 0,
};

describe("placing a graph layout in pixels", () => {
	test("an edge from an opening trade meets a pair's buy row and one from a closing trade its sell row", () => {
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

		const placement = placeGraph(layout, metrics);
		const pair = placement.placedNodeOf(layout.focus);
		const fromBuy = placement.edges.find((e) => e.edge.from.node.source === b.node(buy.event));
		const fromSell = placement.edges.find((e) => e.edge.from.node.source === b.node(sell.event));

		expect(pair.height).toEqual(60);
		expect(fromBuy?.to.x).toEqual(pair.x);
		expect(fromBuy?.to.y).toEqual(pair.y + 20 + 10);
		expect(fromSell?.to.x).toEqual(pair.x);
		expect(fromSell?.to.y).toEqual(pair.y + 20 + 20 + 10);
	});

	test("lanes are bands across the whole graph, as tall as their tallest column", () => {
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

		const placement = placeGraph(layout, metrics);

		// Acquired: one 40 tall node per column, from 0. Middle: the pair is 60 tall, from 40 + 30 = 70.
		// Sold: from 70 + 60 + 30 = 160. The graph ends 40 + 30 below that, less the last gap, plus 6.
		expect(placement.bands).toHaveLength(3);
		expect(placement.bands[0]?.lane).toEqual(GraphLane.ACQUIRED);
		expect(placement.bands[0]?.y).toEqual(0);
		expect(placement.bands[0]?.height).toEqual(40);
		expect(placement.bands[1]?.lane).toEqual(GraphLane.MIDDLE);
		expect(placement.bands[1]?.y).toEqual(70);
		expect(placement.bands[1]?.height).toEqual(60);
		expect(placement.bands[2]?.lane).toEqual(GraphLane.SOLD);
		expect(placement.bands[2]?.y).toEqual(160);
		expect(placement.bands[2]?.height).toEqual(40);
		expect(placement.height).toEqual(206);
		expect(placement.width).toEqual(4 * 150 - 50 + 20);
		expect(placement.headings).toHaveLength(4);
		expect(placement.headings[0]?.x).toEqual(0);
		expect(placement.headings[3]?.x).toEqual(450);
	});

	test("a node is centred in its band, and the columns' nodes keep their order and a gap", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
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
		const one = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 1",
		});
		const two = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "2",
			price: "5",
			currency: "USD",
			label: "buy 2",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const oneLayout = layout.layoutNodeOf(b.node(one.row));
		const twoLayout = layout.layoutNodeOf(b.node(two.row));
		assert(oneLayout !== null);
		assert(twoLayout !== null);

		const placement = placeGraph(layout, metrics);
		const first = placement.placedNodeOf(oneLayout);
		const second = placement.placedNodeOf(twoLayout);

		expect(first.x).toEqual(150);
		expect(first.y).toEqual(0);
		expect(second.x).toEqual(150);
		expect(second.y).toEqual(first.y + first.height + 10);
	});

	test("an edge from a trade to the one rebuilt from it is a curve with a badge at its middle", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });

		// The acquired band holds two nodes in the trades' column (the trade and the faded action),
		// so it is 40 + 10 + 40 = 90 tall; the trade is at its top (y 0) and the rebuilt trade, alone
		// in its column, is centred in it: (90 - 40) / 2 = 25.
		const placement = placeGraph(layout, metrics);
		const rebuilt = placement.edges.find((e) => e.edge.to.node.source === b.node(split.rebuilt));
		const parsed = placement.edges.find((e) => e.edge.to.node.source === b.node(buy.row));

		expect(rebuilt?.edge.split).not.toBeNull();
		expect(rebuilt?.from.x).toEqual(400);
		expect(rebuilt?.from.y).toEqual(20);
		expect(rebuilt?.to.x).toEqual(450);
		expect(rebuilt?.to.y).toEqual(45);
		expect(rebuilt?.badge?.x).toEqual(425);
		expect(rebuilt?.badge?.y).toEqual(32.5);
		expect(rebuilt?.path).toEqual("M400,20 C425,20 425,45 450,45");
		expect(parsed?.badge).toBeNull();
	});

	test("a curve bends at least 24 even between close columns", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });

		const placement = placeGraph(layout, { ...metrics, columnGap: 10 });
		const edge = placement.edges.find((e) => e.edge.to.node.source === b.node(buy.row));

		// The file is in the middle band, 70 down, so its edge leaves at 70 + 20 = 90; the row's edge
		// enters at 20. File right edge 100, row left edge 110: half the distance is 5, so the bend is 24.
		expect(edge?.path).toEqual("M100,90 C124,90 86,20 110,20");
	});
});
