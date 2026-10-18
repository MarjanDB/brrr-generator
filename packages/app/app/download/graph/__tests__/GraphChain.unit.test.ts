import { ProvenanceEventKind } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { chainOfEdge, chainOfNode } from "~/download/graph/chain";
import { GraphNodeKind } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { layoutGraph, layoutNodeOf } from "~/utils/graphLayout";
import { graphModelOf } from "~/utils/graphModel";

describe("highlight chains", () => {
	test("the chain of a row is its file, itself, its trade and the pair, and nothing faded", () => {
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
		const sellRow = layoutNodeOf(layout, b.node(sell.row));
		assert(sellRow !== null);

		const chain = chainOfNode(layout, sellRow);

		expect(chain.nodes.size).toEqual(4);
		expect(chain.edges.size).toEqual(3);
		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(sell.row))).toEqual(true);
		expect(chain.sources.has(b.node(sell.event))).toEqual(true);
		expect(chain.sources.has(b.node(match.lot))).toEqual(true);
		expect(chain.sources.has(b.node(match.acquiredLine))).toEqual(true);
		expect(chain.sources.has(b.node(match.soldLine))).toEqual(true);
		expect(chain.sources.has(b.node(match.soldLeg))).toEqual(true);
		expect(chain.sources.has(b.node(buy.row))).toEqual(false);
		expect(chain.sources.has(b.node(buy.event))).toEqual(false);
	});

	test("the chain of an edge keeps what is before its start and after its end, and no other branch", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const toFirstPair = layout.edges.find(
			(edge) => edge.to.node.source === b.node(firstMatch.lot) && !edge.isStub,
		);
		assert(toFirstPair !== undefined);

		const chain = chainOfEdge(layout, toFirstPair);

		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(sell.row))).toEqual(true);
		expect(chain.sources.has(b.node(sell.event))).toEqual(true);
		expect(chain.sources.has(b.node(firstMatch.lot))).toEqual(true);
		expect(chain.sources.has(b.node(secondMatch.lot))).toEqual(false);
		expect(chain.nodes.size).toEqual(4);
		expect(chain.edges.size).toEqual(3);
	});

	test("a chain never includes a stack or a stub", () => {
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const stack = layout.nodes.find((n) => n.node.kind === GraphNodeKind.STACK);
		assert(stack !== undefined);

		const chain = chainOfNode(layout, layout.focus);

		expect(chain.nodes.size).toEqual(3);
		expect(chain.nodes.has(stack)).toEqual(false);
		expect(chain.sources.has(b.node(file))).toEqual(true);
		expect(chain.sources.has(b.node(one.row))).toEqual(false);
	});
});
