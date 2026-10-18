import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetailKind,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { CaptionSegmentKind } from "~/download/graph/CaptionSegmentKind";
import { captionOf } from "~/download/graph/caption";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { layoutGraph } from "~/download/graph/layoutGraph";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the caption of a graph", () => {
	test("a sale's caption says what it was matched with and how many lines that made", () => {
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
		b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sell,
			quantity: "5",
			boughtOn: "2024-01-11",
			soldOn: "2024-03-10",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(sell.event), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(3);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[0]?.node?.node.source).toBe(b.node(sell.event));
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.MATCHED_WITH);
		expect(caption[1]?.count).toEqual(2);
		expect(caption[1]?.opposite).toEqual(ProvenanceEventKind.ACQUIRED);
		expect(caption[1]?.node?.node.source).toBe(b.node(firstMatch.lot));
		expect(caption[2]?.kind).toEqual(CaptionSegmentKind.REPORT_LINES);
		expect(caption[2]?.count).toEqual(4);
	});

	test("a purchase's caption says it was matched with sales", () => {
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

		const caption = captionOf(layout);

		expect(caption).toHaveLength(3);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.MATCHED_WITH);
		expect(caption[1]?.count).toEqual(1);
		expect(caption[1]?.opposite).toEqual(ProvenanceEventKind.SOLD);
		expect(caption[2]?.count).toEqual(2);
	});

	test("a split trade's caption names the rebuilt trade", () => {
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
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-09-10",
			quantity: "-40",
			price: "12",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: { ...buy, event: split.rebuilt },
			sold: sell,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-09-10",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(buy.event), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(4);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.SPLIT_INTO);
		expect(caption[1]?.node?.node.source).toBe(b.node(split.rebuilt));
		expect(caption[2]?.kind).toEqual(CaptionSegmentKind.MATCHED_WITH);
		expect(caption[2]?.count).toEqual(1);
		expect(caption[3]?.kind).toEqual(CaptionSegmentKind.REPORT_LINES);
		expect(caption[3]?.count).toEqual(2);
	});

	test("a dividend's caption says how many lines it was summed into", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const payer = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-02",
			amount: "3.5",
			currency: "EUR",
			label: "dividend TTE",
		});
		const tax = b.dividend({
			file,
			instrument: payer,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-02",
			amount: "-0.9",
			currency: "EUR",
			label: "tax TTE",
		});
		const sums = b.sumInto({
			instrument: payer,
			events: [dividend, tax],
			dateReceived: "2024-04-02",
		});
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(dividend.event), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(2);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.SUMMED_INTO);
		expect(caption[1]?.count).toEqual(1);
		expect(caption[1]?.node?.node.source).toBe(b.node(sums.line));
	});

	test("a pair's caption says bought and sold", () => {
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

		const caption = captionOf(layout);

		expect(caption).toHaveLength(2);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.BOUGHT_AND_SOLD);
		expect(caption[1]?.node?.node.source).toBe(b.node(match.lot));
	});

	test("a corporate action's caption counts the trades it adjusted", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const firstBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "first buy",
		});
		const secondBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-11",
			quantity: "2",
			price: "100",
			currency: "USD",
			label: "second buy",
		});
		const split = b.split({
			trade: firstBuy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-06-10",
		});
		const secondRebuilt = {};
		b.graph.node(secondRebuilt, ProvenanceNodeKind.EVENT, "second buy after split", {
			[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.ACQUIRED,
			[ProvenanceField.QUANTITY]: "20",
		});
		b.graph.derive([secondBuy.event], secondRebuilt, ProvenanceChange.SPLIT, stage, null);
		b.graph.derive([split.action], secondRebuilt, ProvenanceChange.SPLIT, stage, null);
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(split.action), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(2);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.ADJUSTED);
		expect(caption[1]?.count).toEqual(2);
	});

	test("a split's caption counts the trades it adjusted, not the broker lots it rescaled", () => {
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
			label: "buy",
		});
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-06-10",
		});
		const rescaledLot = {};
		b.graph.node(rescaledLot, ProvenanceNodeKind.LOT, "lot after split", {
			[ProvenanceField.QUANTITY]: "40",
		});
		b.graph.derive([split.action], rescaledLot, ProvenanceChange.SPLIT, stage, null);
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(split.action), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(2);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.ADJUSTED);
		expect(caption[1]?.count).toEqual(1);
	});

	test("a corporate action that adjusted no trade (a rename) is captioned by itself", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const rename = {};
		b.graph.node(rename, ProvenanceNodeKind.CORPORATE_ACTION, "RENAME OLD → NEW", {});
		b.graph.derive([file], rename, ProvenanceChange.CONVERTED, stage, null);
		const model = new GraphIndex(b.graph, b.reading()).model(false);
		const layout = layoutGraph(model, { focus: b.node(rename), expanded: new Set() });

		const caption = captionOf(layout);

		expect(caption).toHaveLength(1);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
	});

	test("a broker lot that was left out says why", () => {
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

		const caption = captionOf(layout);

		expect(caption).toHaveLength(2);
		expect(caption[0]?.kind).toEqual(CaptionSegmentKind.FOCUS);
		expect(caption[1]?.kind).toEqual(CaptionSegmentKind.LEFT_OUT);
		expect(caption[1]?.drop?.reason).toEqual(DropReason.NOT_USED);
	});
});
