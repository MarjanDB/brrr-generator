import { ProvenanceChange, ProvenanceEventKind, ProvenanceStage } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphNodeKind } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { layoutGraph, layoutNodeOf } from "~/utils/graphLayout";
import { graphModelOf } from "~/utils/graphModel";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what a click on a card in the graph focuses", () => {
	test("in a buy's graph, its lot and the sale on the other side are one click away, and the buy and its row are not", () => {
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
		const onTheTimeline = new Set([b.node(buy.event), b.node(sell.event), b.node(match.lot)]);

		const layout = layoutGraph(model, {
			focus: b.node(buy.event),
			expanded: new Set(),
			focusable: onTheTimeline,
		});

		expect(layoutNodeOf(layout, b.node(match.lot))?.follow).toBe(b.node(match.lot));
		expect(layoutNodeOf(layout, b.node(sell.event))?.follow).toBe(b.node(sell.event));
		expect(layout.focus.follow).toBeNull();
		expect(layoutNodeOf(layout, b.node(buy.row))?.follow).toBeNull();
		expect(layoutNodeOf(layout, b.node(file))?.follow).toBeNull();
	});

	test("in a lot's graph, both trades are one click away, as the lot is from theirs", () => {
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
		const onTheTimeline = new Set([b.node(buy.event), b.node(sell.event), b.node(match.lot)]);

		const layout = layoutGraph(model, {
			focus: b.node(match.lot),
			expanded: new Set(),
			focusable: onTheTimeline,
		});

		expect(layoutNodeOf(layout, b.node(buy.event))?.isStub).toEqual(false);
		expect(layoutNodeOf(layout, b.node(buy.event))?.follow).toBe(b.node(buy.event));
		expect(layoutNodeOf(layout, b.node(sell.event))?.follow).toBe(b.node(sell.event));
		expect(layout.focus.follow).toBeNull();
		expect(layoutNodeOf(layout, b.node(sell.row))?.follow).toBeNull();
	});

	test("a trade the timeline doesn't draw is never followed, even as a stub", () => {
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

		const layout = layoutGraph(model, {
			focus: b.node(buy.event),
			expanded: new Set(),
			focusable: new Set([b.node(buy.event)]),
		});

		expect(layoutNodeOf(layout, b.node(sell.event))?.isStub).toEqual(true);
		expect(layoutNodeOf(layout, b.node(sell.event))?.follow).toBeNull();
	});

	test("a trade before a split stands for the trade it became", () => {
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
		const match = b.match({
			instrument: acme,
			acquired: { row: buy.row, record: buy.record, staged: buy.staged, event: split.rebuilt },
			sold: sell,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = graphModelOf(b.graph, b.reading(), false);
		const onTheTimeline = new Set([
			b.node(split.rebuilt),
			b.node(sell.event),
			b.node(split.action),
			b.node(match.lot),
		]);

		const lotGraph = layoutGraph(model, {
			focus: b.node(match.lot),
			expanded: new Set(),
			focusable: onTheTimeline,
		});
		const tradeGraph = layoutGraph(model, {
			focus: b.node(split.rebuilt),
			expanded: new Set(),
			focusable: onTheTimeline,
		});

		expect(layoutNodeOf(lotGraph, b.node(buy.event))?.follow).toBe(b.node(split.rebuilt));
		expect(layoutNodeOf(lotGraph, b.node(split.action))?.follow).toBe(b.node(split.action));
		expect(layoutNodeOf(tradeGraph, b.node(buy.event))?.follow).toBeNull();
		expect(layoutNodeOf(tradeGraph, b.node(split.action))?.follow).toBe(b.node(split.action));
	});

	test("a stack spreads and is never followed", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const layout = layoutGraph(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set([
				b.node(sell.event),
				b.node(one.event),
				b.node(two.event),
				b.node(three.event),
			]),
		});
		const stack = layout.nodes.find((node) => node.node.kind === GraphNodeKind.STACK);

		expect(stack?.follow).toBeNull();
	});
});
