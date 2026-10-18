import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { chainOfNode } from "~/download/graph/chain";
import { FocusState } from "~/download/graph/FocusState";
import { interact, remapForModel } from "~/download/graph/view/graphInteraction";
import { InteractionKind } from "~/download/graph/view/InteractionKind";
import { GraphDirection, GraphNodeKind, PairSide, StackKey } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { layoutGraph, layoutNodeOf } from "~/utils/graphLayout";
import { graphModelOf } from "~/utils/graphModel";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what a click in the graph does", () => {
	test("clicking a node lights its chain and keeps the focus", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const sellRow = layoutNodeOf(layout, b.node(sell.row));
		assert(sellRow !== null);

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(sell.event)),
			expanded: new Set(),
			kind: InteractionKind.NODE,
			node: sellRow,
			edge: null,
			side: null,
		});

		expect(result.focusState.focus).toBe(b.node(sell.event));
		expect(result.focusState.lit?.sources.has(b.node(sell.row))).toEqual(true);
		expect(result.focusState.lit?.sources.has(b.node(buy.row))).toEqual(false);
		expect(result.popoverNode?.kind).toEqual(GraphNodeKind.ROW);
	});

	test("clicking a trade lights its chain and opens no popover", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(buy.event)),
			expanded: new Set(),
			kind: InteractionKind.NODE,
			node: layout.focus,
			edge: null,
			side: null,
		});

		expect(result.focusState.lit?.sources.has(b.node(buy.event))).toEqual(true);
		expect(result.popoverNode).toEqual(null);
	});

	test("clicking a stub moves the focus to it, remembers the old one and clears the light", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const buyStub = layoutNodeOf(layout, b.node(buy.event));
		assert(buyStub !== null);
		const lit = FocusState.start(b.node(sell.event)).light(chainOfNode(layout, layout.focus));

		const result = interact({
			layout,
			focusState: lit,
			expanded: new Set(),
			kind: InteractionKind.STUB,
			node: buyStub,
			edge: null,
			side: null,
		});

		expect(buyStub.isStub).toEqual(true);
		expect(result.focusState.focus).toBe(b.node(buy.event));
		expect(result.focusState.trail).toEqual([b.node(sell.event)]);
		expect(result.focusState.lit).toEqual(null);
		expect(result.popoverNode).toEqual(null);
	});

	test("clicking a stack spreads it and keeps the focus", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const first = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "first",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 2024-01-11",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-12",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 2024-01-12",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-13",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 2024-01-13",
		});
		b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-14",
			quantity: "1",
			price: "5",
			currency: "USD",
			label: "buy 2024-01-14",
		});
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(first.event), expanded: new Set() });
		const stack = layout.nodes.find((node) => node.node.kind === GraphNodeKind.STACK);
		assert(stack !== undefined);
		assert(stack.node.stack !== null);

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(first.event)),
			expanded: new Set(),
			kind: InteractionKind.STACK,
			node: stack,
			edge: null,
			side: null,
		});

		expect(result.expanded.has(stack.node.stack.key)).toEqual(true);
		expect(result.focusState.focus).toBe(b.node(first.event));
		expect(result.focusState.lit).toEqual(null);
	});

	test("clicking an edge lights the chain through that edge", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const rowToEvent = layout.edges.find((edge) => edge.to === layout.focus && !edge.isStub);
		assert(rowToEvent !== undefined);

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(buy.event)),
			expanded: new Set(),
			kind: InteractionKind.EDGE,
			node: null,
			edge: rowToEvent,
			side: null,
		});

		expect(result.focusState.lit?.sources.has(b.node(buy.row))).toEqual(true);
		expect(result.focusState.lit?.sources.has(b.node(buy.event))).toEqual(true);
		expect(result.focusState.focus).toBe(b.node(buy.event));
	});

	test("clicking a pair's row lights the pair's chain and opens that line's popover", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const pair = layoutNodeOf(layout, b.node(match.lot));
		assert(pair !== null);

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(sell.event)),
			expanded: new Set(),
			kind: InteractionKind.PAIR_ROW,
			node: pair,
			edge: null,
			side: PairSide.SOLD,
		});

		expect(result.focusState.lit?.sources.has(b.node(match.soldLine))).toEqual(true);
		expect(result.popoverNode?.kind).toEqual(GraphNodeKind.REPORT_LINE);
		expect(result.popoverNode?.source).toBe(b.node(match.soldLine));
	});

	test("a background click clears the light and the popover", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const lit = FocusState.start(b.node(buy.event)).light(chainOfNode(layout, layout.focus));

		const result = interact({
			layout,
			focusState: lit,
			expanded: new Set(),
			kind: InteractionKind.BACKGROUND,
			node: null,
			edge: null,
			side: null,
		});

		expect(result.focusState.focus).toBe(b.node(buy.event));
		expect(result.focusState.lit).toEqual(null);
		expect(result.popoverNode).toEqual(null);
	});

	test("Escape clears the light and the popover", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const lit = FocusState.start(b.node(buy.event)).light(chainOfNode(layout, layout.focus));

		const result = interact({
			layout,
			focusState: lit,
			expanded: new Set(),
			kind: InteractionKind.ESCAPE,
			node: null,
			edge: null,
			side: null,
		});

		expect(result.focusState.lit).toEqual(null);
		expect(result.popoverNode).toEqual(null);
	});

	test("a left-out node can be lit but never becomes the focus", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const lot = {};
		b.graph.node(lot, ProvenanceNodeKind.LOT, "lot ACME", {});
		b.graph.derive([file], lot, ProvenanceChange.CONVERTED, stage, null);
		b.graph.drop(lot, DropReason.NOT_USED, stage, {
			kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS,
			values: {},
		});
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(lot), expanded: new Set() });
		const dropped = layout.nodes.find((node) => node.node.kind === GraphNodeKind.DROP);
		assert(dropped !== undefined);

		const result = interact({
			layout,
			focusState: FocusState.start(b.node(lot)),
			expanded: new Set(),
			kind: InteractionKind.STUB,
			node: dropped,
			edge: null,
			side: null,
		});

		expect(result.focusState.focus).toBe(b.node(lot));
		expect(result.focusState.lit?.nodes.has(dropped)).toEqual(true);
	});

	test("changing the focus clears the spread stacks, and lighting a chain keeps them", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const buyStub = layoutNodeOf(layout, b.node(buy.event));
		assert(buyStub !== null);
		const spread = new Set([
			StackKey.of(layout.focus.node.key, GraphDirection.UP, GraphNodeKind.ROW),
		]);

		const moved = interact({
			layout,
			focusState: FocusState.start(b.node(sell.event)),
			expanded: spread,
			kind: InteractionKind.STUB,
			node: buyStub,
			edge: null,
			side: null,
		});
		const lit = interact({
			layout,
			focusState: FocusState.start(b.node(sell.event)),
			expanded: spread,
			kind: InteractionKind.NODE,
			node: layout.focus,
			edge: null,
			side: null,
		});

		expect(moved.expanded.size).toEqual(0);
		expect(lit.expanded.size).toEqual(1);
	});
});

describe("switching which steps the graph shows", () => {
	test("a focus on a hidden step lands on a visible neighbour, and stays there when the step shows again", () => {
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
		const onRecord = FocusState.start(b.node(buy.record));

		const simple = remapForModel(onRecord, graphModelOf(b.graph, b.reading(), false));
		const everyStep = remapForModel(simple, graphModelOf(b.graph, b.reading(), true));

		expect(simple.focus).toBe(b.node(buy.event));
		expect(everyStep.focus).toBe(b.node(buy.event));
	});
});
