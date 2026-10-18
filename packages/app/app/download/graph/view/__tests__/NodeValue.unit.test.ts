import { ProvenanceEventKind, ProvenanceLegSide } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphNodeKey, StackKey } from "~/download/graph/GraphIdentifiers";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { GraphStack } from "~/download/graph/GraphStack";
import { NodeValueKind } from "~/download/graph/view/NodeValueKind";
import { legSideKeys, stackKindKeys } from "~/download/graph/view/nodeValueKeys";
import { nodeValueOf } from "~/download/graph/view/nodeValueOf";

describe("what a graph node says", () => {
	test("with every step shown, a parsed record says what kind of step it is, not lib's label", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "3",
			price: "600",
			currency: "USD",
			label: "buy ACME",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(true);

		const value = nodeValueOf(model.nodeFor(b.node(buy.record)), "en");

		expect(value.kind).toEqual(NodeValueKind.STEP);
		expect(value.params.kind).toEqual(stackKindKeys[GraphNodeKind.RECORD]);
		expect(value.keyParams).toEqual(["kind"]);
	});

	test("with every step shown, a leg says its side and quantity", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(true);

		const value = nodeValueOf(model.nodeFor(b.node(match.soldLeg)), "en");

		expect(value.kind).toEqual(NodeValueKind.LEG);
		expect(value.params.side).toEqual(legSideKeys[ProvenanceLegSide.SOLD]);
		expect(value.params.quantity).toEqual("-10");
		expect(value.keyParams).toEqual(["side"]);
	});

	test("a trade says its quantity, price and currency", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "3",
			price: "600",
			currency: "USD",
			label: "buy ACME",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const value = nodeValueOf(model.nodeFor(b.node(buy.event)), "en");

		expect(value.kind).toEqual(NodeValueKind.TRADE);
		expect(value.params.quantity).toEqual("3");
		expect(value.params.price).toEqual("600");
		expect(value.params.currency).toEqual("USD");
	});

	test("a dividend says its amount and currency", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const dividend = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-02-01",
			amount: "12.5",
			currency: "USD",
			label: "dividend ACME",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const value = nodeValueOf(model.nodeFor(b.node(dividend.event)), "en");

		expect(value.kind).toEqual(NodeValueKind.CASH);
		expect(value.params.amount).toEqual("12.5");
		expect(value.params.currency).toEqual("USD");
	});

	test("a corporate action says its split ratio from its fields", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "600",
			currency: "USD",
			label: "buy ACME",
		});
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-06-01",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const value = nodeValueOf(model.nodeFor(b.node(split.action)), "en");

		expect(value.kind).toEqual(NodeValueKind.SPLIT);
		expect(value.params.before).toEqual("10");
		expect(value.params.after).toEqual("1");
	});

	test("a matched lot says how much it matched", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(true);

		const value = nodeValueOf(model.nodeFor(b.node(match.lot)), "en");

		expect(value.kind).toEqual(NodeValueKind.MATCHED);
		expect(value.params.quantity).toEqual("10");
	});

	test("a report line is told apart by the field it has", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(true);

		const bought = nodeValueOf(model.nodeFor(b.node(match.acquiredLine)), "en");
		const sold = nodeValueOf(model.nodeFor(b.node(match.soldLine)), "en");

		expect(bought.kind).toEqual(NodeValueKind.LINE_BOUGHT);
		expect(bought.params.date).toEqual("Jan 10");
		expect(bought.params.quantity).toEqual("10");
		expect(sold.kind).toEqual(NodeValueKind.LINE_SOLD);
		expect(sold.params.date).toEqual("Mar 10");
		expect(sold.params.quantity).toEqual("-10");
	});

	test("a dividend line says its date and leaves out what it has no field for", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const dividend = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-02-01",
			amount: "12.5",
			currency: "USD",
			label: "dividend ACME",
		});
		const sums = b.sumInto({ instrument: acme, events: [dividend], dateReceived: "2024-02-01" });
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const value = nodeValueOf(model.nodeFor(b.node(sums.line)), "en");

		expect(value.kind).toEqual(NodeValueKind.LINE_DIVIDEND);
		expect(value.params.date).toEqual("Feb 1");
		expect(value.params.amount).toEqual("");
	});

	test("a stack says how many and of what", () => {
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
		const second = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "2",
			price: "5",
			currency: "USD",
			label: "second",
		});
		const third = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-12",
			quantity: "3",
			price: "5",
			currency: "USD",
			label: "third",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const owner = model.nodeFor(b.node(first.event));
		const stack = new GraphNode({
			key: GraphNodeKey.Schema.parse("stack"),
			kind: GraphNodeKind.STACK,
			source: null,
			pair: null,
			drop: null,
			stack: new GraphStack({
				key: StackKey.of(owner.key, GraphDirection.UP, GraphNodeKind.ROW),
				owner,
				direction: GraphDirection.UP,
				memberKind: GraphNodeKind.ROW,
				members: [
					model.nodeFor(b.node(first.row)),
					model.nodeFor(b.node(second.row)),
					model.nodeFor(b.node(third.row)),
				],
			}),
			warnings: [],
		});

		const value = nodeValueOf(stack, "en");

		expect(value.kind).toEqual(NodeValueKind.STACK);
		expect(value.params.count).toEqual("3");
		expect(value.params.kind).toEqual(stackKindKeys[GraphNodeKind.ROW]);
	});

	test("a file shows its name and a row its own label", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "3",
			price: "600",
			currency: "USD",
			label: "buy ACME",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const fileValue = nodeValueOf(model.nodeFor(b.node(file)), "en");
		const rowValue = nodeValueOf(model.nodeFor(b.node(buy.row)), "en");

		expect(fileValue.kind).toEqual(NodeValueKind.TEXT);
		expect(fileValue.params.text).toEqual("U1.xml");
		expect(rowValue.kind).toEqual(NodeValueKind.TEXT);
		expect(rowValue.params.text).toEqual("buy ACME");
	});

	test("a missing field gives an empty parameter", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const odd = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			amount: "12.5",
			currency: "USD",
			label: "a trade recorded without a quantity",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const value = nodeValueOf(model.nodeFor(b.node(odd.event)), "en");

		expect(value.kind).toEqual(NodeValueKind.TRADE);
		expect(value.params.quantity).toEqual("");
	});
});
