import {
	DropReason,
	EDavkiProvenanceField,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useGraphText } from "~/composables/useGraphText";
import {
	GraphDirection,
	type GraphNode,
	GraphNodeKey,
	GraphNodeKind,
	type SplitFactor,
	SplitFactorKind,
	StackKey,
} from "~/types/provenanceGraph";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { captionOf } from "~/utils/graphCaption";
import { layoutGraph } from "~/utils/graphLayout";
import { graphModelOf, modelNodeFor } from "~/utils/graphModel";

const stage = ProvenanceStage.Schema.parse("Test");

const context = {
	ticker: "ACME",
	lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
};

// The text composable and the i18n locale it reads, so a test can switch the language. The app is
// shared between tests, so each starts in English.
async function mountText() {
	const mounted = await mountComposable(() => ({ text: useGraphText(), i18n: useI18n() }));
	await mounted.i18n.setLocale("en");
	return mounted;
}

describe("the words of a graph's caption", () => {
	test("a sale names its kind, its quantity and its ticker", async () => {
		const { text } = await mountText();
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
		const [focus] = captionOf(layout);
		assert(focus !== undefined);

		const sentence = text.captionText(focus, context);

		expect(sentence).toEqual("Sold 10 ACME");
	});

	test("a sale says how many buys it was matched with, by which method", async () => {
		const { text } = await mountText();
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
		const [, matched] = captionOf(layout);
		assert(matched !== undefined);

		const sentence = text.captionText(matched, context);

		expect(sentence).toEqual("matched with 1 buy(s) by FIFO");
	});

	test("a purchase says how many sells it was matched with", async () => {
		const { text } = await mountText();
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
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const [, matched] = captionOf(layout);
		assert(matched !== undefined);

		const sentence = text.captionText(matched, context);

		expect(sentence).toEqual("matched with 1 sell(s) by FIFO");
	});

	test("the report lines a sale ended in are counted", async () => {
		const { text } = await mountText();
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
		const [, , lines] = captionOf(layout);
		assert(lines !== undefined);

		const sentence = text.captionText(lines, context);

		expect(sentence).toEqual("2 report line(s)");
	});

	test("a dividend names its kind and amount, then the lines it was summed into", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(dividend.event), expanded: new Set() });
		const [focus, summed] = captionOf(layout);
		assert(focus !== undefined);
		assert(summed !== undefined);

		const focusSentence = text.captionText(focus, context);
		const summedSentence = text.captionText(summed, context);

		expect(focusSentence).toEqual("Dividend 12.5 USD");
		expect(summedSentence).toEqual("summed into 1 report line(s)");
	});

	test("a split trade names the quantity it was rebuilt with", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });
		const [, splitInto] = captionOf(layout);
		assert(splitInto !== undefined);

		const sentence = text.captionText(splitInto, context);

		expect(sentence).toEqual("split into 40");
	});

	test("a pair says what it bought and what it sold", async () => {
		const { text } = await mountText();
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
		const layout = layoutGraph(model, { focus: b.node(match.lot), expanded: new Set() });
		const [focus, boughtAndSold] = captionOf(layout);
		assert(focus !== undefined);
		assert(boughtAndSold !== undefined);

		const focusSentence = text.captionText(focus, context);
		const sentence = text.captionText(boughtAndSold, context);

		expect(focusSentence).toEqual("10 matched");
		expect(sentence).toEqual("bought 10, sold 10");
	});

	test("a corporate action counts the trades it adjusted", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const layout = layoutGraph(model, { focus: b.node(split.action), expanded: new Set() });
		const [focus, adjusted] = captionOf(layout);
		assert(focus !== undefined);
		assert(adjusted !== undefined);

		const focusSentence = text.captionText(focus, context);
		const sentence = text.captionText(adjusted, context);

		expect(focusSentence).toEqual("10 : 1 split");
		expect(sentence).toEqual("adjusted 1 trade(s)");
	});

	test("a broker lot that was left out says why", async () => {
		const { text } = await mountText();
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
		const [, leftOut] = captionOf(layout);
		assert(leftOut !== undefined);

		const sentence = text.captionText(leftOut, context);

		expect(sentence).toEqual(
			"Not used: this form matches derivative trades without the broker's lots.",
		);
	});
});

describe("what a graph node says", () => {
	test("with every step shown, a parsed record says what kind of step it is, not lib's label", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), true);

		const sentence = text.nodeText(modelNodeFor(model, b.node(buy.record)));

		expect(sentence).toEqual("parsed record");
	});

	test("with every step shown, a leg says its side and quantity", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), true);

		const sentence = text.nodeText(modelNodeFor(model, b.node(match.soldLeg)));

		expect(sentence).toEqual("sold · -10");
	});

	test("a trade says its quantity, price and currency", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const sentence = text.nodeText(modelNodeFor(model, b.node(buy.event)));

		expect(sentence).toEqual("3 @ 600 USD");
	});

	test("a dividend says its amount and currency", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const sentence = text.nodeText(modelNodeFor(model, b.node(dividend.event)));

		expect(sentence).toEqual("12.5 USD");
	});

	test("a corporate action says its split ratio from its fields", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const sentence = text.nodeText(modelNodeFor(model, b.node(split.action)));

		expect(sentence).toEqual("10 : 1 split");
	});

	test("a split ratio is written in Slovenian once the language switches", async () => {
		const { text, i18n } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const node = modelNodeFor(model, b.node(split.action));
		await i18n.setLocale("sl");

		const sentence = text.nodeText(node);

		expect(sentence).toEqual("delitev 10 : 1");
	});

	test("a matched lot says how much it matched", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), true);

		const sentence = text.nodeText(modelNodeFor(model, b.node(match.lot)));

		expect(sentence).toEqual("10 matched");
	});

	test("a report line is told apart by the field it has", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), true);

		const bought = text.nodeText(modelNodeFor(model, b.node(match.acquiredLine)));
		const sold = text.nodeText(modelNodeFor(model, b.node(match.soldLine)));
		const boughtFromSource = text.reportLineText(b.node(match.acquiredLine));

		expect(bought).toEqual("bought 10 · Jan 10");
		expect(sold).toEqual("sold -10 · Mar 10");
		expect(boughtFromSource).toEqual("bought 10 · Jan 10");
	});

	test("a dividend line says its date and leaves out what it has no field for", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const sentence = text.nodeText(modelNodeFor(model, b.node(sums.line)));

		expect(sentence).toEqual("Feb 1 · ");
	});

	test("a stack says how many and of what", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);
		const owner = modelNodeFor(model, b.node(first.event));
		const stack: GraphNode = {
			key: GraphNodeKey.Schema.parse("stack"),
			kind: GraphNodeKind.STACK,
			source: null,
			pair: null,
			drop: null,
			stack: {
				key: StackKey.of(owner.key, GraphDirection.UP, GraphNodeKind.ROW),
				owner,
				direction: GraphDirection.UP,
				memberKind: GraphNodeKind.ROW,
				members: [
					modelNodeFor(model, b.node(first.row)),
					modelNodeFor(model, b.node(second.row)),
					modelNodeFor(model, b.node(third.row)),
				],
			},
			warnings: [],
		};

		const sentence = text.nodeText(stack);

		expect(sentence).toEqual("3 × row");
	});

	test("a file shows its name and a row its own label", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const fileSentence = text.nodeText(modelNodeFor(model, b.node(file)));
		const rowSentence = text.nodeText(modelNodeFor(model, b.node(buy.row)));

		expect(fileSentence).toEqual("U1.xml");
		expect(rowSentence).toEqual("buy ACME");
	});

	test("a missing field gives an empty value", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), false);

		const sentence = text.nodeText(modelNodeFor(model, b.node(odd.event)));

		expect(sentence).toEqual(" @ 12.5 USD");
	});
});

describe("the text on a split badge", () => {
	test("a split that multiplies says ×10", async () => {
		const { text } = await mountText();
		const factor: SplitFactor = { kind: SplitFactorKind.MULTIPLY, amount: 10 };

		expect(text.splitBadge(factor)).toEqual("×10");
	});

	test("a reverse split says ÷4", async () => {
		const { text } = await mountText();
		const factor: SplitFactor = { kind: SplitFactorKind.DIVIDE, amount: 4 };

		expect(text.splitBadge(factor)).toEqual("÷4");
	});

	test("a fractional factor uses the English decimal point", async () => {
		const { text } = await mountText();
		const factor: SplitFactor = { kind: SplitFactorKind.MULTIPLY, amount: 1.5 };

		expect(text.splitBadge(factor)).toEqual("×1.5");
	});

	test("a fractional factor uses the Slovenian decimal comma", async () => {
		const { text, i18n } = await mountText();
		const factor: SplitFactor = { kind: SplitFactorKind.MULTIPLY, amount: 1.5 };
		await i18n.setLocale("sl");

		expect(text.splitBadge(factor)).toEqual("×1,5");
	});
});

describe("what a popover shows", () => {
	test("a broker row shows its attributes by name, with the file it came from", async () => {
		const { text } = await mountText();
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const row = {};
		b.graph.node(row, ProvenanceNodeKind.ROW, "Trade ACME", { zeta: "1", alpha: "2" });
		b.graph.derive([file], row, ProvenanceChange.CONTAINS, stage, null);
		const model = graphModelOf(b.graph, b.reading(), false);
		const node = modelNodeFor(model, b.node(row));

		const popover = text.popoverOf(node, new ProvenanceWalker(b.graph), "KDVP");

		expect(popover?.title).toEqual("Broker row");
		expect(popover?.rows).toHaveLength(2);
		expect(popover?.rows[0]?.name).toEqual("alpha");
		expect(popover?.rows[0]?.value).toEqual("2");
		expect(popover?.rows[1]?.name).toEqual("zeta");
		expect(popover?.rows[1]?.value).toEqual("1");
		expect(popover?.foot).toEqual("From U1.xml");
	});

	test("a report line shows the values the form gets, named as the form names them", async () => {
		const { text } = await mountText();
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
		const model = graphModelOf(b.graph, b.reading(), true);
		const node = modelNodeFor(model, b.node(match.acquiredLine));

		const popover = text.popoverOf(node, new ProvenanceWalker(b.graph), "KDVP");

		expect(popover?.title).toEqual("Report line");
		expect(popover?.rows).toHaveLength(2);
		expect(popover?.rows[0]?.name).toEqual("Bought on");
		expect(popover?.rows[0]?.value).toEqual("2024-01-10");
		expect(popover?.rows[1]?.name).toEqual("Quantity");
		expect(popover?.rows[1]?.value).toEqual("10");
		expect(popover?.foot).toEqual("The KDVP line's values, as in its CSV");
	});

	test("a trade has no popover", async () => {
		const { text } = await mountText();
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

		const popover = text.popoverOf(
			modelNodeFor(model, b.node(buy.event)),
			new ProvenanceWalker(b.graph),
			"KDVP",
		);

		expect(popover).toEqual(null);
	});

	test("a report line's amount is rounded and written the locale's way", async () => {
		const { text, i18n } = await mountText();
		const b = new GraphBuilder();
		const line = {};
		b.graph.node(line, ProvenanceNodeKind.REPORT_LINE, "line", {
			[EDavkiProvenanceField.COMMISSIONS]: "-0.6966666666666667",
		});
		const node: GraphNode = {
			key: GraphNodeKey.Schema.parse("line"),
			kind: GraphNodeKind.REPORT_LINE,
			source: b.node(line),
			pair: null,
			drop: null,
			stack: null,
			warnings: [],
		};
		await i18n.setLocale("sl");

		const popover = text.popoverOf(node, new ProvenanceWalker(b.graph), "KDVP");

		expect(popover?.title).toEqual("Vrstica poročila");
		expect(popover?.rows[0]?.name).toEqual("Provizije");
		expect(popover?.rows[0]?.value).toEqual("−0,696667");
	});

	test("a report line's tracking id is shown unchanged, with no thousands separators", async () => {
		const { text } = await mountText();
		const b = new GraphBuilder();
		const line = {};
		b.graph.node(line, ProvenanceNodeKind.REPORT_LINE, "line", {
			[EDavkiProvenanceField.TRACKING_ID]: "102869793",
		});
		const node: GraphNode = {
			key: GraphNodeKey.Schema.parse("line"),
			kind: GraphNodeKind.REPORT_LINE,
			source: b.node(line),
			pair: null,
			drop: null,
			stack: null,
			warnings: [],
		};

		const popover = text.popoverOf(node, new ProvenanceWalker(b.graph), "KDVP");

		expect(popover?.rows[0]?.name).toEqual("Tracking ID");
		expect(popover?.rows[0]?.value).toEqual("102869793");
	});

	test("a broker row's attribute is shown exactly like the export", async () => {
		const { text } = await mountText();
		const b = new GraphBuilder();
		const row = {};
		b.graph.node(row, ProvenanceNodeKind.ROW, "Trade ACME", { tradePrice: "8.020000001" });
		const node: GraphNode = {
			key: GraphNodeKey.Schema.parse("row"),
			kind: GraphNodeKind.ROW,
			source: b.node(row),
			pair: null,
			drop: null,
			stack: null,
			warnings: [],
		};

		const popover = text.popoverOf(node, new ProvenanceWalker(b.graph), "KDVP");

		expect(popover?.rows[0]?.name).toEqual("tradePrice");
		expect(popover?.rows[0]?.value).toEqual("8.020000001");
	});
});
