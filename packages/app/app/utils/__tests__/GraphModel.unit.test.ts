import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphLane, GraphNodeKind, SplitFactorKind } from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import {
	graphModelOf,
	modelIns,
	modelIsRebuilt,
	modelLaneOf,
	modelNodeFor,
	modelOuts,
	splitFactorOf,
} from "~/utils/graphModel";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the visible model of a report's graph", () => {
	test("the instrument is not in the graph, and no edge goes through it", () => {
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

		expect(model.nodes.find((n) => n.source === b.node(acme))).toBeUndefined();
		expect(modelOuts(model, modelNodeFor(model, b.node(buy.event)))).toHaveLength(1);
		expect(modelOuts(model, modelNodeFor(model, b.node(buy.event)))[0]?.to.kind).toEqual(
			GraphNodeKind.PAIR,
		);
		expect(modelNodeFor(model, b.node(match.lot)).kind).toEqual(GraphNodeKind.PAIR);
	});

	test("a matched lot and its two lines are one pair, with the sides read from the legs", () => {
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

		expect(model.pairs).toHaveLength(1);
		expect(model.pairs[0]?.acquired.line).toBe(b.node(match.acquiredLine));
		expect(model.pairs[0]?.sold.line).toBe(b.node(match.soldLine));
		expect(modelNodeFor(model, b.node(match.acquiredLine))).toBe(
			modelNodeFor(model, b.node(match.lot)),
		);
		expect(modelNodeFor(model, b.node(match.soldLeg))).toBe(modelNodeFor(model, b.node(match.lot)));
		expect(modelNodeFor(model, b.node(match.lot)).pair).toBe(model.pairs[0]);
	});

	test("every step shows the lot, its legs and its lines, and the record the default view folds", () => {
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

		const every = graphModelOf(b.graph, b.reading(), true);
		const folded = graphModelOf(b.graph, b.reading(), false);

		expect(every.pairs).toHaveLength(0);
		expect(modelNodeFor(every, b.node(match.lot)).kind).toEqual(GraphNodeKind.MATCHED_LOT);
		expect(modelNodeFor(every, b.node(match.acquiredLine)).kind).toEqual(GraphNodeKind.REPORT_LINE);
		expect(modelNodeFor(every, b.node(match.soldLeg)).kind).toEqual(GraphNodeKind.LEG);
		expect(modelNodeFor(every, b.node(buy.record)).kind).toEqual(GraphNodeKind.RECORD);
		expect(modelNodeFor(folded, b.node(buy.record))).toBe(modelNodeFor(folded, b.node(buy.event)));
		expect(folded.nodes.find((n) => n.source === b.node(buy.record))).toBeUndefined();
	});

	test("hidden steps fold into one edge that keeps the first change", () => {
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

		const folded = graphModelOf(b.graph, b.reading(), false);
		const every = graphModelOf(b.graph, b.reading(), true);

		expect(modelOuts(folded, modelNodeFor(folded, b.node(buy.row)))).toHaveLength(1);
		expect(modelOuts(folded, modelNodeFor(folded, b.node(buy.row)))[0]?.to).toBe(
			modelNodeFor(folded, b.node(buy.event)),
		);
		expect(modelOuts(folded, modelNodeFor(folded, b.node(buy.row)))[0]?.change).toEqual(
			ProvenanceChange.PARSED,
		);
		expect(modelOuts(every, modelNodeFor(every, b.node(buy.row)))[0]?.to.kind).toEqual(
			GraphNodeKind.RECORD,
		);
	});

	test("a trade rebuilt by a split is in the next column; a deduplicated record is not", () => {
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
		const copy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "copy of buy ACME",
		});
		b.graph.derive([copy.record], buy.record, ProvenanceChange.DEDUPLICATED, stage, null);

		const model = graphModelOf(b.graph, b.reading(), false);
		const every = graphModelOf(b.graph, b.reading(), true);

		expect(modelIsRebuilt(model, modelNodeFor(model, b.node(split.rebuilt)))).toEqual(true);
		expect(modelIsRebuilt(model, modelNodeFor(model, b.node(buy.event)))).toEqual(false);
		expect(modelIsRebuilt(model, modelNodeFor(model, b.node(split.action)))).toEqual(false);
		expect(modelIsRebuilt(model, modelNodeFor(model, b.node(buy.row)))).toEqual(false);
		expect(modelIsRebuilt(every, modelNodeFor(every, b.node(buy.record)))).toEqual(false);
	});

	test("the edge from a trade to its split trade carries the factor, and no other edge does", () => {
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
		const forward = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-06-10",
		});
		const second = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "10",
			price: "100",
			currency: "USD",
			label: "buy more ACME",
		});
		const reverse = b.split({
			trade: second,
			instrument: acme,
			before: "10",
			after: "1",
			date: "2024-06-10",
		});
		const model = graphModelOf(b.graph, b.reading(), false);

		const multiplied = modelOuts(model, modelNodeFor(model, b.node(buy.event))).find(
			(edge) => edge.to === modelNodeFor(model, b.node(forward.rebuilt)),
		);
		const divided = modelOuts(model, modelNodeFor(model, b.node(second.event))).find(
			(edge) => edge.to === modelNodeFor(model, b.node(reverse.rebuilt)),
		);
		const fromAction = modelOuts(model, modelNodeFor(model, b.node(forward.action))).find(
			(edge) => edge.to === modelNodeFor(model, b.node(forward.rebuilt)),
		);

		expect(multiplied?.split?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(multiplied?.split?.amount).toEqual(10);
		expect(divided?.split?.kind).toEqual(SplitFactorKind.DIVIDE);
		expect(divided?.split?.amount).toEqual(10);
		expect(fromAction?.split).toBeNull();
		expect(modelOuts(model, modelNodeFor(model, b.node(buy.row)))[0]?.split).toBeNull();
	});

	test("a split factor is a multiple or a division, and nothing for a number that isn't one", () => {
		expect(splitFactorOf("4", "40")?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(splitFactorOf("4", "40")?.amount).toEqual(10);
		expect(splitFactorOf("10", "1")?.kind).toEqual(SplitFactorKind.DIVIDE);
		expect(splitFactorOf("10", "1")?.amount).toEqual(10);
		expect(splitFactorOf("2", "3")?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(splitFactorOf("2", "3")?.amount).toEqual(1.5);
		expect(splitFactorOf("0", "3")).toBeNull();
		expect(splitFactorOf("two", "3")).toBeNull();
	});

	test("lanes come from the event kind, and a row takes the lane of what it became", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const payer = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
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
		const dividend = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-02",
			amount: "3",
			currency: "EUR",
			label: "dividend TTE",
		});
		const tax = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-02",
			amount: "-1",
			currency: "EUR",
			label: "tax TTE",
		});
		b.graph.derive([buy.row], sell.record, ProvenanceChange.PARSED, stage, null);
		const lonely = {};
		b.graph.node(lonely, ProvenanceNodeKind.ROW, "lonely row", {});
		const model = graphModelOf(b.graph, b.reading(), false);

		expect(modelLaneOf(model, modelNodeFor(model, b.node(buy.event)))).toEqual(GraphLane.ACQUIRED);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(sell.event)))).toEqual(GraphLane.SOLD);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(dividend.event)))).toEqual(
			GraphLane.ACQUIRED,
		);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(tax.event)))).toEqual(GraphLane.SOLD);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(match.lot)))).toEqual(GraphLane.MIDDLE);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(dividend.row)))).toEqual(
			GraphLane.ACQUIRED,
		);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(tax.row)))).toEqual(GraphLane.SOLD);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(buy.row)))).toEqual(GraphLane.MIDDLE);
		expect(modelLaneOf(model, modelNodeFor(model, b.node(lonely)))).toEqual(GraphLane.MIDDLE);
	});

	test("a lot closed outside the period is one pair with one left-out node", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2021-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2022-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const closed = b.matchClosed({ instrument: acme, acquired: buy, sold: sell, quantity: "10" });
		const detail = {
			kind: ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD,
			values: { [ProvenanceDetailValue.DATE]: "2022-03-10" },
		};
		b.graph.drop(closed.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, detail);
		b.graph.drop(closed.soldLeg, DropReason.OUTSIDE_PERIOD, stage, detail);

		const model = graphModelOf(b.graph, b.reading(), false);
		const drops = model.nodes.filter((n) => n.kind === GraphNodeKind.DROP);
		const [dropNode] = drops;
		const pair = modelNodeFor(model, b.node(closed.lot));
		assert(dropNode !== undefined);

		expect(drops).toHaveLength(1);
		expect(drops[0]?.drop?.reason).toEqual(DropReason.OUTSIDE_PERIOD);
		expect(modelIns(model, dropNode)).toHaveLength(1);
		expect(modelIns(model, dropNode)[0]?.from).toBe(pair);
		expect(modelLaneOf(model, dropNode)).toEqual(modelLaneOf(model, pair));
		expect(pair.pair?.leftOut).toHaveLength(1);
		expect(pair.pair?.acquired.line).toBeNull();
		expect(pair.pair?.sold.line).toBeNull();
	});

	test("an unreadable file is a drop owned by the file", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "broken.xml" });
		b.graph.drop(file, DropReason.UNREADABLE, stage, {
			kind: ProvenanceDetailKind.FILE_ERROR,
			values: { [ProvenanceDetailValue.ERROR]: "not XML" },
		});

		const model = graphModelOf(b.graph, b.reading(), false);
		const fileNode = modelNodeFor(model, b.node(file));

		expect(model.nodes).toHaveLength(2);
		expect(modelOuts(model, fileNode)).toHaveLength(1);
		expect(modelOuts(model, fileNode)[0]?.to.kind).toEqual(GraphNodeKind.DROP);
		expect(modelOuts(model, fileNode)[0]?.to.drop?.reason).toEqual(DropReason.UNREADABLE);
	});

	test("a warning on a report line shows on the pair, or on the line when every step is shown", () => {
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
		b.graph.warn(match.acquiredLine, stage, {
			kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
			values: { [ProvenanceDetailValue.ISIN]: "US0000000001" },
		});

		const folded = graphModelOf(b.graph, b.reading(), false);
		const every = graphModelOf(b.graph, b.reading(), true);

		expect(modelNodeFor(folded, b.node(match.lot)).warnings).toHaveLength(1);
		expect(modelNodeFor(folded, b.node(buy.event)).warnings).toHaveLength(0);
		expect(modelNodeFor(every, b.node(match.acquiredLine)).warnings).toHaveLength(1);
		expect(modelNodeFor(every, b.node(match.lot)).warnings).toHaveLength(0);
	});

	test("the node of an instrument throws, because an instrument is never a focus", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		b.trade({
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

		expect(() => modelNodeFor(model, b.node(acme))).toThrow();
	});

	test("a file is drawn as itself in both modes", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });

		const folded = graphModelOf(b.graph, b.reading(), false);
		const every = graphModelOf(b.graph, b.reading(), true);

		expect(modelNodeFor(folded, b.node(file)).kind).toEqual(GraphNodeKind.FILE);
		expect(modelNodeFor(every, b.node(file)).kind).toEqual(GraphNodeKind.FILE);
	});
});
