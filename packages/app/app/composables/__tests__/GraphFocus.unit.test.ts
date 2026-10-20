import { ProvenanceEventKind } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import {
	mountComposable,
	mountComposableUnder,
} from "~/composables/__tests__/support/mountComposable";
import { GraphLayouts } from "~/composables/provenanceGraph/graphLayouts";
import { GraphModels } from "~/composables/provenanceGraph/graphModels";
import { type GraphFocus, provideGraphFocus, useGraphFocus } from "~/composables/useGraphFocus";
import { GraphNodeKind } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

describe("the download step's graph focus", () => {
	test("a new focus has its node, an empty trail and nothing lit", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const file = b.node(builtFile);
		const focus = await mountComposable(() => provideGraphFocus());

		focus.start(file);

		expect(focus.node.value).toBe(file);
		expect(focus.trail.value).toHaveLength(0);
		expect(focus.lit.value).toBeNull();
		expect(focus.canGoBack.value).toEqual(false);
	});

	test("before it starts the focus has no node", async () => {
		const focus = await mountComposable(() => provideGraphFocus());

		expect(focus.node.value).toBeNull();
		expect(focus.canGoBack.value).toEqual(false);
	});

	test("refocusing twice and going back twice returns to the first focus", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const event = b.node(buy.event);
		const focus = await mountComposable(() => provideGraphFocus());

		focus.start(file);
		focus.refocus(row);
		focus.refocus(event);

		expect(focus.node.value).toBe(event);
		expect(focus.trail.value).toEqual([file, row]);
		expect(focus.canGoBack.value).toEqual(true);

		focus.back();

		expect(focus.node.value).toBe(row);
		expect(focus.trail.value).toEqual([file]);

		focus.back();

		expect(focus.node.value).toBe(file);
		expect(focus.trail.value).toHaveLength(0);
		expect(focus.canGoBack.value).toEqual(false);
	});

	test("refocusing on the node already in focus does not grow the trail", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const focus = await mountComposable(() => provideGraphFocus());

		focus.start(file);
		focus.refocus(row);
		focus.refocus(row);

		expect(focus.node.value).toBe(row);
		expect(focus.trail.value).toEqual([file]);
	});

	test("going back with an empty trail leaves the focus where it is", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const file = b.node(builtFile);
		const focus = await mountComposable(() => provideGraphFocus());

		focus.start(file);
		focus.back();

		expect(focus.node.value).toBe(file);
		expect(focus.trail.value).toHaveLength(0);
	});

	test("starting again drops the trail and what was lit", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const event = b.node(buy.event);
		const layout = GraphLayouts.of(GraphModels.of(b.graph, b.reading(), false), {
			focus: event,
			expanded: new Set(),
			focusable: new Set(),
		});
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(file);
		focus.refocus(event);
		focus.lightNode(layout, layout.focus);

		focus.start(file);

		expect(focus.node.value).toBe(file);
		expect(focus.trail.value).toHaveLength(0);
		expect(focus.lit.value).toBeNull();
	});

	test("lighting a chain keeps it until the next refocus", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const event = b.node(buy.event);
		const row = b.node(buy.row);
		const layout = GraphLayouts.of(GraphModels.of(b.graph, b.reading(), false), {
			focus: event,
			expanded: new Set(),
			focusable: new Set(),
		});
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(event);

		focus.lightNode(layout, layout.focus);

		expect(focus.lit.value?.sources.has(event)).toEqual(true);
		expect(focus.node.value).toBe(event);

		focus.refocus(row);

		expect(focus.lit.value).toBeNull();
	});

	test("going back clears what was lit", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const event = b.node(buy.event);
		const row = b.node(buy.row);
		const layout = GraphLayouts.of(GraphModels.of(b.graph, b.reading(), false), {
			focus: event,
			expanded: new Set(),
			focusable: new Set(),
		});
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(event);
		focus.refocus(row);
		focus.lightNode(layout, layout.focus);

		focus.back();

		expect(focus.node.value).toBe(event);
		expect(focus.lit.value).toBeNull();
	});

	test("clearing the light keeps the focus and the trail", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const event = b.node(buy.event);
		const row = b.node(buy.row);
		const layout = GraphLayouts.of(GraphModels.of(b.graph, b.reading(), false), {
			focus: row,
			expanded: new Set(),
			focusable: new Set(),
		});
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(event);
		focus.refocus(row);
		focus.lightNode(layout, layout.focus);

		focus.clearLight();

		expect(focus.node.value).toBe(row);
		expect(focus.trail.value).toEqual([event]);
		expect(focus.lit.value).toBeNull();
	});

	test("mapping the focus maps the trail too and clears what was lit", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file: builtFile,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const file = b.node(builtFile);
		const row = b.node(buy.row);
		const event = b.node(buy.event);
		const layout = GraphLayouts.of(GraphModels.of(b.graph, b.reading(), false), {
			focus: row,
			expanded: new Set(),
			focusable: new Set(),
		});
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(file);
		focus.refocus(row);
		focus.lightNode(layout, layout.focus);

		focus.remap((node) => (node === row ? event : node));

		expect(focus.node.value).toBe(event);
		expect(focus.trail.value).toEqual([file]);
		expect(focus.lit.value).toBeNull();
	});

	test("asking for a focus nobody provided is an error", async () => {
		await expect(mountComposable(() => useGraphFocus())).rejects.toThrow(
			"useGraphFocus: no ancestor called provideGraphFocus",
		);
	});

	test("a descendant sees the focus its ancestor provided", async () => {
		const b = new GraphBuilder();
		const builtFile = b.file({ name: "U1.xml" });
		const file = b.node(builtFile);
		const provided: { focus: GraphFocus | null } = { focus: null };

		const injected = await mountComposableUnder(
			() => {
				provided.focus = provideGraphFocus();
			},
			() => useGraphFocus(),
		);
		assert(provided.focus !== null);
		provided.focus.start(file);

		expect(injected).toBe(provided.focus);
		expect(injected.node.value).toBe(file);
	});
});

describe("the chain a lit node or edge stands for", () => {
	test("the chain of a row is its file, itself, its trade, the pair and the trade on the pair's other side", async () => {
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
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const sellRow = GraphLayouts.nodeOf(layout, b.node(sell.row));
		assert(sellRow !== null);
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(b.node(sell.event));

		focus.lightNode(layout, sellRow);
		const chain = focus.lit.value;
		assert(chain !== null);

		expect(chain.nodes.size).toEqual(5);
		expect(chain.edges.size).toEqual(4);
		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(sell.row))).toEqual(true);
		expect(chain.sources.has(b.node(sell.event))).toEqual(true);
		expect(chain.sources.has(b.node(match.lot))).toEqual(true);
		expect(chain.sources.has(b.node(match.acquiredLine))).toEqual(true);
		expect(chain.sources.has(b.node(match.soldLine))).toEqual(true);
		expect(chain.sources.has(b.node(match.soldLeg))).toEqual(true);
		expect(chain.sources.has(b.node(buy.event))).toEqual(true);
		expect(chain.sources.has(b.node(buy.row))).toEqual(false);
	});

	test("the chain of an edge keeps what is before its start and after its end, and no other branch", async () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);
		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const toFirstPair = layout.edges.find(
			(edge) => edge.to.node.source === b.node(firstMatch.lot) && !edge.isStub,
		);
		assert(toFirstPair !== undefined);
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(b.node(sell.event));

		focus.lightEdge(layout, toFirstPair);
		const chain = focus.lit.value;
		assert(chain !== null);

		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(sell.row))).toEqual(true);
		expect(chain.sources.has(b.node(sell.event))).toEqual(true);
		expect(chain.sources.has(b.node(firstMatch.lot))).toEqual(true);
		expect(chain.sources.has(b.node(firstBuy.event))).toEqual(true);
		expect(chain.sources.has(b.node(secondMatch.lot))).toEqual(false);
		expect(chain.sources.has(b.node(secondBuy.event))).toEqual(false);
		expect(chain.nodes.size).toEqual(5);
		expect(chain.edges.size).toEqual(4);
	});

	test("a lit lot lights the trade on its other side, drawn as a stub in a trade's graph", async () => {
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
			focus: b.node(buy.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const lot = GraphLayouts.nodeOf(layout, b.node(match.lot));
		const sale = GraphLayouts.nodeOf(layout, b.node(sell.event));
		assert(lot !== null && sale !== null);
		const toSale = layout.edges.find((edge) => edge.to === sale);
		assert(toSale !== undefined);
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(b.node(buy.event));

		focus.lightNode(layout, lot);
		const chain = focus.lit.value;
		assert(chain !== null);

		expect(sale.isStub).toEqual(true);
		expect(chain.nodes.has(sale)).toEqual(true);
		expect(chain.edges.has(toSale)).toEqual(true);
		expect(chain.sources.has(b.node(sell.event))).toEqual(true);
		expect(chain.sources.has(b.node(buy.event))).toEqual(true);
		expect(chain.sources.has(b.node(sell.row))).toEqual(false);
	});

	test("a lit stub lights the path through the edge it hangs on", async () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);
		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const oneRow = GraphLayouts.nodeOf(layout, b.node(one.row));
		assert(oneRow !== null);
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(b.node(sell.event));

		focus.lightNode(layout, oneRow);
		const chain = focus.lit.value;
		assert(chain !== null);

		expect(oneRow.isStub).toEqual(true);
		expect(chain.nodes.size).toEqual(2);
		expect(chain.edges.size).toEqual(1);
		expect(chain.sources.has(b.node(one.row))).toEqual(true);
		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(two.row))).toEqual(false);
		expect(chain.sources.has(b.node(sell.row))).toEqual(false);
	});

	test("a chain leaves out the stacks and stubs hanging off it", async () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);
		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const stack = layout.nodes.find((n) => n.node.kind === GraphNodeKind.STACK);
		assert(stack !== undefined);
		const focus = await mountComposable(() => provideGraphFocus());
		focus.start(b.node(sell.event));

		focus.lightNode(layout, layout.focus);
		const chain = focus.lit.value;
		assert(chain !== null);

		expect(chain.nodes.size).toEqual(3);
		expect(chain.nodes.has(stack)).toEqual(false);
		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(one.row))).toEqual(false);
	});
});
