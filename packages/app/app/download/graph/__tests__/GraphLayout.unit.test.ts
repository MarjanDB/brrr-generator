import { ProvenanceEventKind } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { StackKey } from "~/download/graph/GraphIdentifiers";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { layoutGraph } from "~/download/graph/layoutGraph";

describe("the main path, stubs and stacks of a graph layout", () => {
	test("a sale's main path runs from its file to the pair, and what else touches it is only a stub", () => {
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

		expect(layout.focus.node.source).toBe(b.node(sell.event));
		expect(layout.layoutNodeOf(b.node(file))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(sell.row))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(match.lot))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(match.lot))?.node.kind).toEqual(GraphNodeKind.PAIR);
		expect(layout.layoutNodeOf(b.node(buy.row))?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(b.node(buy.row))?.direction).toEqual(GraphDirection.DOWN);
		expect(layout.layoutNodeOf(b.node(buy.row))?.hasMore).toEqual(true);
		expect(layout.layoutNodeOf(b.node(buy.event))?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(b.node(buy.event))?.direction).toEqual(GraphDirection.UP);
		expect(layout.layoutNodeOf(b.node(acme))).toBeNull();
		expect(layout.layoutNodeOf(b.node(buy.record))).toBeNull();
		expect(layout.nodes).toHaveLength(6);
		expect(layout.edges).toHaveLength(5);
	});

	test("a focus in the middle has both trades on the main path and no stub", () => {
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

		expect(layout.focus.node.kind).toEqual(GraphNodeKind.PAIR);
		expect(layout.layoutNodeOf(b.node(file))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(buy.row))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(sell.row))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(buy.event))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(sell.event))?.isStub).toEqual(false);
		expect(layout.nodes).toHaveLength(6);
		expect(layout.edges).toHaveLength(6);
	});

	test("the other trade of a pair is a stub above the pair", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const firstBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "5",
			price: "5",
			currency: "USD",
			label: "first buy",
		});
		const secondBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "5",
			price: "5",
			currency: "USD",
			label: "second buy",
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
		const firstMatch = b.match({
			instrument: acme,
			acquired: firstBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const secondMatch = b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-01-11",
			soldOn: "2024-03-10",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(firstBuy.event), expanded: new Set() });

		expect(layout.layoutNodeOf(b.node(firstMatch.lot))?.isStub).toEqual(false);
		expect(layout.layoutNodeOf(b.node(sell.event))?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(b.node(sell.event))?.direction).toEqual(GraphDirection.UP);
		expect(layout.layoutNodeOf(b.node(sell.event))?.hasMore).toEqual(true);
		expect(layout.layoutNodeOf(b.node(secondMatch.lot))).toBeNull();
		expect(layout.layoutNodeOf(b.node(secondBuy.event))).toBeNull();
	});

	test("more than two siblings of one kind fold into one stack, which spreads out when asked", () => {
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
		const three = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-12",
			quantity: "3",
			price: "5",
			currency: "USD",
			label: "buy 3",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const fileKey = model.nodeFor(b.node(file)).key;

		const folded = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const stack = folded.nodes.find((n) => n.node.kind === GraphNodeKind.STACK);

		expect(stack?.node.stack?.memberKind).toEqual(GraphNodeKind.ROW);
		expect(stack?.node.stack?.members).toHaveLength(3);
		expect(stack?.direction).toEqual(GraphDirection.DOWN);
		expect(stack?.isStub).toEqual(true);
		expect(folded.layoutNodeOf(b.node(one.row))).toBeNull();

		const key = StackKey.of(fileKey, GraphDirection.DOWN, GraphNodeKind.ROW);
		const spread = layoutGraph(model, {
			focus: b.node(sell.event),
			expanded: new Set([key]),
		});

		expect(spread.nodes.find((n) => n.node.kind === GraphNodeKind.STACK)).toBeUndefined();
		expect(spread.layoutNodeOf(b.node(one.row))?.isStub).toEqual(true);
		expect(spread.layoutNodeOf(b.node(two.row))?.isStub).toEqual(true);
		expect(spread.layoutNodeOf(b.node(three.row))?.isStub).toEqual(true);
	});

	test("exactly two siblings of one kind are not folded", () => {
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

		expect(layout.nodes.find((n) => n.node.kind === GraphNodeKind.STACK)).toBeUndefined();
		expect(layout.layoutNodeOf(b.node(one.row))?.isStub).toEqual(true);
		expect(layout.layoutNodeOf(b.node(two.row))?.isStub).toEqual(true);
	});

	test("a stack hangs on the node whose neighbours it folds", () => {
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
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 1",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "2",
			price: "5",
			currency: "USD",
			label: "buy 2",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-12",
			quantity: "3",
			price: "5",
			currency: "USD",
			label: "buy 3",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const stack = layout.nodes.find((n) => n.node.kind === GraphNodeKind.STACK);

		expect(stack?.node.stack?.owner.source).toBe(b.node(file));
		expect(stack?.node.source).toBeNull();
	});

	test("a focus on a hidden step lands on the node it was folded into", () => {
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

		const layout = layoutGraph(model, { focus: b.node(buy.record), expanded: new Set() });

		expect(layout.focus.node.source).toBe(b.node(buy.event));
	});

	test("a graph of one node lays out", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "empty.xml" });
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const layout = layoutGraph(model, { focus: b.node(file), expanded: new Set() });
		const [only] = layout.nodes;

		assert(only !== undefined);
		expect(layout.nodes).toHaveLength(1);
		expect(layout.edges).toHaveLength(0);
		expect(only).toBe(layout.focus);
	});
});
