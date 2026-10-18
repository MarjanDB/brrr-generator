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
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { GraphLane } from "~/download/graph/GraphLane";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { SplitFactor, SplitFactorKind } from "~/download/graph/SplitFactor";

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
		const index = new GraphIndex(b.graph, b.reading());

		const model = index.model(false);

		expect(model.nodes.find((n) => n.source === b.node(acme))).toBeUndefined();
		expect(model.outs(model.nodeFor(b.node(buy.event)))).toHaveLength(1);
		expect(model.outs(model.nodeFor(b.node(buy.event)))[0]?.to.kind).toEqual(GraphNodeKind.PAIR);
		expect(model.nodeFor(b.node(match.lot)).kind).toEqual(GraphNodeKind.PAIR);
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

		const model = new GraphIndex(b.graph, b.reading()).model(false);

		expect(model.pairs).toHaveLength(1);
		expect(model.pairs[0]?.acquired.line).toBe(b.node(match.acquiredLine));
		expect(model.pairs[0]?.sold.line).toBe(b.node(match.soldLine));
		expect(model.nodeFor(b.node(match.acquiredLine))).toBe(model.nodeFor(b.node(match.lot)));
		expect(model.nodeFor(b.node(match.soldLeg))).toBe(model.nodeFor(b.node(match.lot)));
		expect(model.nodeFor(b.node(match.lot)).pair).toBe(model.pairs[0]);
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
		const index = new GraphIndex(b.graph, b.reading());

		const every = index.model(true);
		const folded = index.model(false);

		expect(every.pairs).toHaveLength(0);
		expect(every.nodeFor(b.node(match.lot)).kind).toEqual(GraphNodeKind.MATCHED_LOT);
		expect(every.nodeFor(b.node(match.acquiredLine)).kind).toEqual(GraphNodeKind.REPORT_LINE);
		expect(every.nodeFor(b.node(match.soldLeg)).kind).toEqual(GraphNodeKind.LEG);
		expect(every.nodeFor(b.node(buy.record)).kind).toEqual(GraphNodeKind.RECORD);
		expect(folded.nodeFor(b.node(buy.record))).toBe(folded.nodeFor(b.node(buy.event)));
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
		const index = new GraphIndex(b.graph, b.reading());

		const folded = index.model(false);
		const every = index.model(true);

		expect(folded.outs(folded.nodeFor(b.node(buy.row)))).toHaveLength(1);
		expect(folded.outs(folded.nodeFor(b.node(buy.row)))[0]?.to).toBe(
			folded.nodeFor(b.node(buy.event)),
		);
		expect(folded.outs(folded.nodeFor(b.node(buy.row)))[0]?.change).toEqual(
			ProvenanceChange.PARSED,
		);
		expect(every.outs(every.nodeFor(b.node(buy.row)))[0]?.to.kind).toEqual(GraphNodeKind.RECORD);
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
		const index = new GraphIndex(b.graph, b.reading());

		const model = index.model(false);
		const every = index.model(true);

		expect(model.isRebuilt(model.nodeFor(b.node(split.rebuilt)))).toEqual(true);
		expect(model.isRebuilt(model.nodeFor(b.node(buy.event)))).toEqual(false);
		expect(model.isRebuilt(model.nodeFor(b.node(split.action)))).toEqual(false);
		expect(model.isRebuilt(model.nodeFor(b.node(buy.row)))).toEqual(false);
		expect(every.isRebuilt(every.nodeFor(b.node(buy.record)))).toEqual(false);
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		const multiplied = model
			.outs(model.nodeFor(b.node(buy.event)))
			.find((edge) => edge.to === model.nodeFor(b.node(forward.rebuilt)));
		const divided = model
			.outs(model.nodeFor(b.node(second.event)))
			.find((edge) => edge.to === model.nodeFor(b.node(reverse.rebuilt)));
		const fromAction = model
			.outs(model.nodeFor(b.node(forward.action)))
			.find((edge) => edge.to === model.nodeFor(b.node(forward.rebuilt)));

		expect(multiplied?.split?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(multiplied?.split?.amount).toEqual(10);
		expect(divided?.split?.kind).toEqual(SplitFactorKind.DIVIDE);
		expect(divided?.split?.amount).toEqual(10);
		expect(fromAction?.split).toBeNull();
		expect(model.outs(model.nodeFor(b.node(buy.row)))[0]?.split).toBeNull();
	});

	test("a split factor is a multiple or a division, and nothing for a number that isn't one", () => {
		expect(SplitFactor.of("4", "40")?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(SplitFactor.of("4", "40")?.amount).toEqual(10);
		expect(SplitFactor.of("10", "1")?.kind).toEqual(SplitFactorKind.DIVIDE);
		expect(SplitFactor.of("10", "1")?.amount).toEqual(10);
		expect(SplitFactor.of("2", "3")?.kind).toEqual(SplitFactorKind.MULTIPLY);
		expect(SplitFactor.of("2", "3")?.amount).toEqual(1.5);
		expect(SplitFactor.of("0", "3")).toBeNull();
		expect(SplitFactor.of("two", "3")).toBeNull();
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		expect(model.laneOf(model.nodeFor(b.node(buy.event)))).toEqual(GraphLane.ACQUIRED);
		expect(model.laneOf(model.nodeFor(b.node(sell.event)))).toEqual(GraphLane.SOLD);
		expect(model.laneOf(model.nodeFor(b.node(dividend.event)))).toEqual(GraphLane.ACQUIRED);
		expect(model.laneOf(model.nodeFor(b.node(tax.event)))).toEqual(GraphLane.SOLD);
		expect(model.laneOf(model.nodeFor(b.node(match.lot)))).toEqual(GraphLane.MIDDLE);
		expect(model.laneOf(model.nodeFor(b.node(dividend.row)))).toEqual(GraphLane.ACQUIRED);
		expect(model.laneOf(model.nodeFor(b.node(tax.row)))).toEqual(GraphLane.SOLD);
		expect(model.laneOf(model.nodeFor(b.node(buy.row)))).toEqual(GraphLane.MIDDLE);
		expect(model.laneOf(model.nodeFor(b.node(lonely)))).toEqual(GraphLane.MIDDLE);
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

		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const drops = model.nodes.filter((n) => n.kind === GraphNodeKind.DROP);
		const [dropNode] = drops;
		const pair = model.nodeFor(b.node(closed.lot));
		assert(dropNode !== undefined);

		expect(drops).toHaveLength(1);
		expect(drops[0]?.drop?.reason).toEqual(DropReason.OUTSIDE_PERIOD);
		expect(model.ins(dropNode)).toHaveLength(1);
		expect(model.ins(dropNode)[0]?.from).toBe(pair);
		expect(model.laneOf(dropNode)).toEqual(model.laneOf(pair));
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

		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const fileNode = model.nodeFor(b.node(file));

		expect(model.nodes).toHaveLength(2);
		expect(model.outs(fileNode)).toHaveLength(1);
		expect(model.outs(fileNode)[0]?.to.kind).toEqual(GraphNodeKind.DROP);
		expect(model.outs(fileNode)[0]?.to.drop?.reason).toEqual(DropReason.UNREADABLE);
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
		const index = new GraphIndex(b.graph, b.reading());

		const folded = index.model(false);
		const every = index.model(true);

		expect(folded.nodeFor(b.node(match.lot)).warnings).toHaveLength(1);
		expect(folded.nodeFor(b.node(buy.event)).warnings).toHaveLength(0);
		expect(every.nodeFor(b.node(match.acquiredLine)).warnings).toHaveLength(1);
		expect(every.nodeFor(b.node(match.lot)).warnings).toHaveLength(0);
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);

		expect(() => model.nodeFor(b.node(acme))).toThrow();
	});

	test("a model is built once per mode", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const index = new GraphIndex(b.graph, b.reading());

		expect(index.model(false)).toBe(index.model(false));
		expect(index.model(true)).toBe(index.model(true));
		expect(index.model(true)).not.toBe(index.model(false));
		expect(index.model(false).nodeFor(b.node(file)).kind).toEqual(GraphNodeKind.FILE);
	});
});
