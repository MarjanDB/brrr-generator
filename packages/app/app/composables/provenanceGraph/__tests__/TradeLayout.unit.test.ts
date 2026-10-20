import { DropReason, ProvenanceChange, ProvenanceEventKind, ProvenanceStage } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphLayouts } from "~/composables/provenanceGraph/graphLayouts";
import { GraphModels } from "~/composables/provenanceGraph/graphModels";
import { GraphDirection, GraphHeading, GraphNodeKind } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the graph of a focused buy or sale", () => {
	test("its history keeps what flowed into the trade and drops what only shares its file", () => {
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
		const other = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-10",
			quantity: "3",
			price: "7",
			currency: "USD",
			label: "another buy",
		});
		b.graph.drop(other.event, DropReason.POSITION_OPEN, stage, null);
		b.match({
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

		expect(GraphLayouts.nodeOf(layout, b.node(file))?.isStub).toEqual(false);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.row))?.isStub).toEqual(false);
		expect(GraphLayouts.nodeOf(layout, b.node(buy.row))).toBeNull();
		expect(GraphLayouts.nodeOf(layout, b.node(other.row))).toBeNull();
		expect(GraphLayouts.nodeOf(layout, b.node(other.event))).toBeNull();
		expect(layout.nodes.filter((node) => node.node.kind === GraphNodeKind.STACK)).toHaveLength(0);
	});

	test("a split that rebuilt the trade stays in its history, with the trade as first recorded", () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(split.rebuilt),
			expanded: new Set(),
			focusable: new Set(),
		});
		const asFirstRecorded = GraphLayouts.nodeOf(layout, b.node(buy.event));
		const action = GraphLayouts.nodeOf(layout, b.node(split.action));

		expect(asFirstRecorded?.isStub).toEqual(false);
		expect(action?.isStub).toEqual(false);
		expect(layout.edges.filter((edge) => edge.split !== null)).toHaveLength(1);
		expect(layout.edges.find((edge) => edge.split !== null)?.from).toBe(asFirstRecorded);
		expect(layout.edges.find((edge) => edge.split !== null)?.to).toBe(layout.focus);
	});

	test("the trade as first recorded, before a split, draws the lots of the trade it became", () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(buy.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const rebuilt = GraphLayouts.nodeOf(layout, b.node(split.rebuilt));
		const lot = GraphLayouts.nodeOf(layout, b.node(match.lot));
		assert(rebuilt !== null && lot !== null);

		expect(layout.focus.node.source).toBe(b.node(buy.event));
		expect(rebuilt.row).toBeNull();
		expect(lot.row).toEqual(0);
		expect(lot.column).toEqual(rebuilt.column + 1);
		expect(GraphLayouts.nodeOf(layout, b.node(sell.event))?.isStub).toEqual(true);
	});

	test("each lot is a row after the trade, ordered by the day of the trade on the other side", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const laterBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "5",
			price: "5",
			currency: "USD",
			label: "later buy",
		});
		const earlierBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "5",
			price: "5",
			currency: "USD",
			label: "earlier buy",
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
		const laterLot = b.match({
			instrument: acme,
			acquired: laterBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-02-01",
			soldOn: "2024-03-10",
		});
		const earlierLot = b.match({
			instrument: acme,
			acquired: earlierBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(GraphLayouts.nodeOf(layout, b.node(earlierLot.lot))?.row).toEqual(0);
		expect(GraphLayouts.nodeOf(layout, b.node(laterLot.lot))?.row).toEqual(1);
		expect(GraphLayouts.nodeOf(layout, b.node(earlierLot.lot))?.column).toEqual(
			layout.focus.column + 1,
		);
		expect(GraphLayouts.nodeOf(layout, b.node(laterLot.lot))?.column).toEqual(
			layout.focus.column + 1,
		);
		expect(layout.focus.row).toBeNull();
	});

	test("the trade on the other side shares its lot's row in the next column, a stub that leads on", () => {
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
		const lot = GraphLayouts.nodeOf(layout, b.node(match.lot));
		const otherSide = GraphLayouts.nodeOf(layout, b.node(buy.event));
		assert(lot !== null && otherSide !== null);

		expect(otherSide.isStub).toEqual(true);
		expect(otherSide.row).toEqual(lot.row);
		expect(otherSide.column).toEqual(lot.column + 1);
		expect(otherSide.direction).toEqual(GraphDirection.DOWN);
		expect(otherSide.hasMore).toEqual(true);
		expect(layout.edges.find((edge) => edge.to === otherSide)?.from).toBe(lot);
		expect(layout.edges.find((edge) => edge.to === otherSide)?.isStub).toEqual(true);
	});

	test("a lot left out ends at why, in its row under the trade on the other side", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
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
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(buy.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const lot = GraphLayouts.nodeOf(layout, b.node(closed.lot));
		const otherSide = GraphLayouts.nodeOf(layout, b.node(sell.event));
		const [why] = layout.nodes.filter((node) => node.node.kind === GraphNodeKind.DROP);
		assert(lot !== null && otherSide !== null && why !== undefined);

		expect(why.row).toEqual(lot.row);
		expect(why.column).toEqual(lot.column + 1);
		expect(otherSide.order).toEqual(0);
		expect(why.order).toEqual(1);
		expect(layout.columns[lot.column + 1]?.headings).toEqual([
			GraphHeading.OTHER_SIDE,
			GraphHeading.LEFT_OUT,
		]);
	});

	test("it draws no bands: buys and sells read from their triangles", () => {
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
		const model = GraphModels.of(b.graph, b.reading(), false);

		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});
		const placement = GraphLayouts.place(layout, GraphLayouts.defaultMetrics);

		expect(layout.banded).toEqual(false);
		expect(placement.bands).toHaveLength(0);
	});

	test("a lot's row lines up: its card and the trade on the other side share the row's middle, and the trade sits in the middle of its lots", () => {
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
			date: "2024-02-01",
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
		const firstLot = b.match({
			instrument: acme,
			acquired: firstBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const secondLot = b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-02-01",
			soldOn: "2024-03-10",
		});
		const model = GraphModels.of(b.graph, b.reading(), false);
		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});

		const placement = GraphLayouts.place(layout, GraphLayouts.defaultMetrics);
		const middleOf = (source: object): number => {
			const layoutNode = GraphLayouts.nodeOf(layout, b.node(source));
			const placed = placement.nodes.find((node) => node.layoutNode === layoutNode);
			assert(placed !== undefined);
			return placed.y + placed.height / 2;
		};

		expect(middleOf(firstBuy.event)).toEqual(middleOf(firstLot.lot));
		expect(middleOf(secondBuy.event)).toEqual(middleOf(secondLot.lot));
		expect(middleOf(sell.event)).toEqual((middleOf(firstLot.lot) + middleOf(secondLot.lot)) / 2);
	});

	test("a lot keeps today's layout, with its bands and no rows", () => {
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

		expect(layout.banded).toEqual(true);
		expect(layout.nodes.every((node) => node.row === null)).toEqual(true);
	});

	test("with every step shown, a trade keeps today's layout", () => {
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
		const model = GraphModels.of(b.graph, b.reading(), true);

		const layout = GraphLayouts.of(model, {
			focus: b.node(sell.event),
			expanded: new Set(),
			focusable: new Set(),
		});

		expect(layout.banded).toEqual(true);
		expect(layout.nodes.every((node) => node.row === null)).toEqual(true);
	});
});
