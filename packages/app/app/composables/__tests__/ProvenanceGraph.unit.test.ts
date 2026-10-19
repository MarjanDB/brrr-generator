import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { assert, describe, expect, onTestFinished, test } from "vitest";
import { nextTick } from "vue";
import { mountComposableUnder } from "~/composables/__tests__/support/mountComposable";
import { provideGraphFocus, useGraphFocus } from "~/composables/useGraphFocus";
import { useProvenanceGraph } from "~/composables/useProvenanceGraph";
import { GraphNodeKind, PairSide } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { layoutNodeOf } from "~/utils/graphLayout";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what a click in the graph does", () => {
	test("clicking a node lights its chain and keeps the focus", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(sell.event));
		const sellRow = layoutNodeOf(view.layout.value, b.node(sell.row));
		assert(sellRow !== null);

		view.clickNode(sellRow);

		expect(focus.node.value).toBe(b.node(sell.event));
		expect(focus.lit.value?.sources.has(b.node(sell.row))).toEqual(true);
		expect(focus.lit.value?.sources.has(b.node(buy.row))).toEqual(false);
		expect(view.popover.value?.node.kind).toEqual(GraphNodeKind.ROW);
		expect(view.popover.value?.anchor).toBe(sellRow);
	});

	test("clicking a trade lights its chain and opens no popover", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));

		view.clickNode(view.layout.value.focus);

		expect(focus.lit.value?.sources.has(b.node(buy.event))).toEqual(true);
		expect(view.popover.value).toEqual(null);
	});

	test("clicking the trade on the other side moves the focus to it, remembers the old one and clears the light", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set([b.node(buy.event), b.node(sell.event)]),
				}),
			}),
		);
		focus.start(b.node(sell.event));
		const buyStub = layoutNodeOf(view.layout.value, b.node(buy.event));
		assert(buyStub !== null);
		focus.lightNode(view.layout.value, view.layout.value.focus);

		view.clickNode(buyStub);

		expect(buyStub.isStub).toEqual(true);
		expect(focus.node.value).toBe(b.node(buy.event));
		expect(focus.trail.value).toEqual([b.node(sell.event)]);
		expect(focus.lit.value).toEqual(null);
		expect(view.popover.value).toEqual(null);
	});

	test("clicking a trade the timeline draws moves the focus to it, on the main path too", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set([b.node(buy.event), b.node(sell.event), b.node(match.lot)]),
				}),
			}),
		);
		focus.start(b.node(match.lot));
		const buyCard = layoutNodeOf(view.layout.value, b.node(buy.event));
		assert(buyCard !== null);

		view.clickNode(buyCard);

		expect(buyCard.isStub).toEqual(false);
		expect(focus.node.value).toBe(b.node(buy.event));
		expect(focus.trail.value).toEqual([b.node(match.lot)]);
		expect(focus.lit.value).toEqual(null);
	});

	test("clicking either row of a lot in a trade's graph moves the focus to the lot", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set([b.node(buy.event), b.node(sell.event), b.node(match.lot)]),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const lot = layoutNodeOf(view.layout.value, b.node(match.lot));
		assert(lot !== null);

		view.clickLine(lot, PairSide.SOLD);

		expect(focus.node.value).toBe(b.node(match.lot));
		expect(focus.trail.value).toEqual([b.node(buy.event)]);
		expect(view.popover.value).toEqual(null);
	});

	test("clicking a stack spreads it and keeps the focus", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(first.event));
		const stack = view.layout.value.nodes.find((node) => node.node.kind === GraphNodeKind.STACK);
		assert(stack !== undefined);
		focus.lightNode(view.layout.value, view.layout.value.focus);

		view.spread(stack);

		const stackAfter = view.layout.value.nodes.find(
			(node) => node.node.kind === GraphNodeKind.STACK,
		);
		expect(stackAfter).toBeUndefined();
		expect(focus.node.value).toBe(b.node(first.event));
		expect(focus.lit.value).toEqual(null);
		expect(view.popover.value).toEqual(null);
	});

	test("clicking an edge lights the chain through that edge", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const rowToEvent = view.layout.value.edges.find(
			(edge) => edge.to === view.layout.value.focus && !edge.isStub,
		);
		assert(rowToEvent !== undefined);

		view.activateEdge(rowToEvent);

		expect(focus.lit.value?.sources.has(b.node(buy.row))).toEqual(true);
		expect(focus.lit.value?.sources.has(b.node(buy.event))).toEqual(true);
		expect(focus.node.value).toBe(b.node(buy.event));
	});

	test("clicking a row of the focused lot lights the lot's chain and opens that line's popover", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set([b.node(buy.event), b.node(sell.event), b.node(match.lot)]),
				}),
			}),
		);
		focus.start(b.node(match.lot));
		const pair = layoutNodeOf(view.layout.value, b.node(match.lot));
		assert(pair !== null);

		view.clickLine(pair, PairSide.SOLD);

		expect(focus.lit.value?.sources.has(b.node(match.soldLine))).toEqual(true);
		expect(view.popover.value?.node.kind).toEqual(GraphNodeKind.REPORT_LINE);
		expect(view.popover.value?.node.source).toBe(b.node(match.soldLine));
		expect(view.popover.value?.anchor).toBe(pair);
	});

	test("a background click clears the light and the popover", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const row = layoutNodeOf(view.layout.value, b.node(buy.row));
		assert(row !== null);
		view.clickNode(row);

		view.clearLight();

		expect(focus.node.value).toBe(b.node(buy.event));
		expect(focus.lit.value).toEqual(null);
		expect(view.popover.value).toEqual(null);
	});

	test("Escape clears the light and the popover", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const row = layoutNodeOf(view.layout.value, b.node(buy.row));
		assert(row !== null);
		view.clickNode(row);

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

		expect(focus.lit.value).toEqual(null);
		expect(view.popover.value).toEqual(null);
	});

	test("Escape is left to an open popover or dialog elsewhere on the page", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const row = layoutNodeOf(view.layout.value, b.node(buy.row));
		assert(row !== null);
		view.clickNode(row);
		// What reka-ui puts on the page while one of its popovers or dialogs is open.
		const layer = document.createElement("div");
		layer.setAttribute("data-dismissable-layer", "");
		document.body.append(layer);
		onTestFinished(() => layer.remove());

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

		expect(focus.lit.value).not.toEqual(null);
		expect(view.popover.value?.node).toBe(row.node);
	});

	test("closing the popover keeps the chain lit", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const row = layoutNodeOf(view.layout.value, b.node(buy.row));
		assert(row !== null);
		view.clickNode(row);

		view.closePopover();

		expect(focus.lit.value).not.toEqual(null);
		expect(view.popover.value).toEqual(null);
	});

	test("a left-out node can be lit but never becomes the focus", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const lot = {};
		b.graph.node(lot, ProvenanceNodeKind.LOT, "lot ACME", {});
		b.graph.derive([file], lot, ProvenanceChange.CONVERTED, stage, null);
		b.graph.drop(lot, DropReason.NOT_USED, stage, {
			kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS,
			values: {},
		});
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(lot));
		const dropped = view.layout.value.nodes.find((node) => node.node.kind === GraphNodeKind.DROP);
		assert(dropped !== undefined);

		view.clickNode(dropped);

		expect(focus.node.value).toBe(b.node(lot));
		expect(focus.lit.value?.nodes.has(dropped)).toEqual(true);
	});

	test("changing the focus folds the spread stacks again", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(first.event));
		await nextTick();
		const stack = view.layout.value.nodes.find((node) => node.node.kind === GraphNodeKind.STACK);
		assert(stack !== undefined);
		view.spread(stack);
		const spreadStack = view.layout.value.nodes.find(
			(node) => node.node.kind === GraphNodeKind.STACK,
		);
		expect(spreadStack).toBeUndefined();

		view.clickNode(view.layout.value.focus);
		await nextTick();

		const stillSpread = view.layout.value.nodes.find(
			(node) => node.node.kind === GraphNodeKind.STACK,
		);
		expect(stillSpread).toBeUndefined();

		focus.refocus(b.node(first.row));
		await nextTick();

		const foldedStack = view.layout.value.nodes.find(
			(node) => node.node.kind === GraphNodeKind.STACK,
		);
		expect(foldedStack).toBeDefined();
	});

	test("changing the focus closes the popover", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const row = layoutNodeOf(view.layout.value, b.node(buy.row));
		assert(row !== null);
		view.clickNode(row);
		expect(view.popover.value).not.toBeNull();

		focus.refocus(b.node(buy.row));
		await nextTick();

		expect(view.popover.value).toBeNull();
	});

	test("lighting a chain keeps the layout it was lit in", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.event));
		const before = view.layout.value;

		view.clickNode(view.layout.value.focus);

		expect(view.layout.value).toBe(before);
	});
});

describe("switching which steps the graph shows", () => {
	test("a focus on a hidden step lands on a visible neighbour, and stays there when the step shows again", async () => {
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
		const { focus, view } = await mountComposableUnder(
			() => provideGraphFocus(),
			() => ({
				focus: useGraphFocus(),
				view: useProvenanceGraph({
					graph: () => b.graph,
					reading: () => b.reading(),
					focusable: () => new Set(),
				}),
			}),
		);
		focus.start(b.node(buy.record));

		view.toggleEveryStep();

		expect(view.showEveryStep.value).toEqual(true);
		expect(focus.node.value).toBe(b.node(buy.record));

		view.toggleEveryStep();

		expect(view.showEveryStep.value).toEqual(false);
		expect(focus.node.value).toBe(b.node(buy.event));

		view.toggleEveryStep();

		expect(focus.node.value).toBe(b.node(buy.event));
	});
});
