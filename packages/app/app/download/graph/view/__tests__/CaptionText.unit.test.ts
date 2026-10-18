import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { captionOf } from "~/download/graph/caption";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { layoutGraph } from "~/download/graph/layoutGraph";
import { captionTextOf } from "~/download/graph/view/captionTextOf";
import { NodeValueKind } from "~/download/graph/view/NodeValueKind";
import { nodeValueKeys } from "~/download/graph/view/nodeValueKeys";
import { eventKindKeys, lotMatchingKeys } from "~/download/sentences/sentenceKeys";

const stage = ProvenanceStage.Schema.parse("Test");

const context = {
	ticker: "ACME",
	lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	locale: "en",
};

describe("the words of a graph's caption", () => {
	test("a sale names its kind, its quantity and its ticker", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const [focus] = captionOf(layout);
		assert(focus !== undefined);

		const text = captionTextOf(focus, context);

		expect(text.key).toEqual("download_caption_trade");
		expect(text.params.kind).toEqual(eventKindKeys[ProvenanceEventKind.SOLD]);
		expect(text.params.quantity).toEqual("10");
		expect(text.params.ticker).toEqual("ACME");
		expect(text.keyParams).toEqual(["kind"]);
		expect(text.node?.node.source).toBe(b.node(sell.event));
	});

	test("a sale says how many buys it was matched with, by which method", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const [, matched] = captionOf(layout);
		assert(matched !== undefined);

		const text = captionTextOf(matched, context);

		expect(text.key).toEqual("download_caption_matched_buys");
		expect(text.params.count).toEqual("1");
		expect(text.params.method).toEqual(lotMatchingKeys[TaxAuthorityLotMatchingMethod.FIFO]);
		expect(text.keyParams).toEqual(["method"]);
	});

	test("a purchase says how many sells it was matched with", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const [, matched] = captionOf(layout);
		assert(matched !== undefined);

		const text = captionTextOf(matched, context);

		expect(text.key).toEqual("download_caption_matched_sells");
		expect(text.params.count).toEqual("1");
	});

	test("the report lines a sale ended in are counted", () => {
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
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });
		const [, , lines] = captionOf(layout);
		assert(lines !== undefined);

		const text = captionTextOf(lines, context);

		expect(text.key).toEqual("download_badge_lines");
		expect(text.params.n).toEqual("2");
	});

	test("a dividend names its kind and amount, then the lines it was summed into", () => {
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
		b.sumInto({ instrument: acme, events: [dividend], dateReceived: "2024-02-01" });
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(dividend.event), expanded: new Set() });
		const [focus, summed] = captionOf(layout);
		assert(focus !== undefined);
		assert(summed !== undefined);

		const focusText = captionTextOf(focus, context);
		const summedText = captionTextOf(summed, context);

		expect(focusText.key).toEqual("download_caption_cash");
		expect(focusText.params.kind).toEqual(eventKindKeys[ProvenanceEventKind.DIVIDEND]);
		expect(focusText.params.amount).toEqual("12.5");
		expect(focusText.params.currency).toEqual("USD");
		expect(summedText.key).toEqual("download_caption_summed_into");
		expect(summedText.params.n).toEqual("1");
	});

	test("a split trade names the quantity it was rebuilt with", () => {
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
		b.split({ trade: buy, instrument: acme, before: "4", after: "40", date: "2024-06-01" });
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const [, splitInto] = captionOf(layout);
		assert(splitInto !== undefined);

		const text = captionTextOf(splitInto, context);

		expect(text.key).toEqual("download_caption_split_into");
		expect(text.params.quantity).toEqual("40");
	});

	test("a pair says what it bought and what it sold", () => {
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
		const [focus, boughtAndSold] = captionOf(layout);
		assert(focus !== undefined);
		assert(boughtAndSold !== undefined);

		const focusText = captionTextOf(focus, context);
		const text = captionTextOf(boughtAndSold, context);

		expect(focusText.key).toEqual(nodeValueKeys[NodeValueKind.MATCHED]);
		expect(focusText.params.quantity).toEqual("10");
		expect(text.key).toEqual("download_caption_bought_sold");
		expect(text.params.bought).toEqual("10");
		expect(text.params.sold).toEqual("10");
	});

	test("a corporate action counts the trades it adjusted", () => {
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
		const layout = layoutGraph(model, { focus: b.node(split.action), expanded: new Set() });
		const [focus, adjusted] = captionOf(layout);
		assert(focus !== undefined);
		assert(adjusted !== undefined);

		const focusText = captionTextOf(focus, context);
		const text = captionTextOf(adjusted, context);

		expect(focusText.key).toEqual(nodeValueKeys[NodeValueKind.SPLIT]);
		expect(focusText.params.before).toEqual("10");
		expect(text.key).toEqual("download_caption_adjusted");
		expect(text.params.n).toEqual("1");
	});

	test("a broker lot that was left out carries its drop", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const lot = {};
		b.graph.node(lot, ProvenanceNodeKind.LOT, "lot ACME", {});
		b.graph.derive([file], lot, ProvenanceChange.CONVERTED, stage, null);
		b.graph.drop(lot, DropReason.NOT_USED, stage, {
			kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS,
			values: {},
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(lot), expanded: new Set() });
		const [, leftOut] = captionOf(layout);
		assert(leftOut !== undefined);

		const text = captionTextOf(leftOut, context);

		expect(text.drop?.reason).toEqual(DropReason.NOT_USED);
	});
});
