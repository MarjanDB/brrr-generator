import {
	DropReason,
	ProvenanceEventKind,
	ProvenanceStage,
	ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useInstrumentTimeline } from "~/composables/useInstrumentTimeline";
import { TimelineMarkKind } from "~/types/timeline";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { timelineRows } from "~/utils/instrumentTimeline";

const stage = ProvenanceStage.Schema.parse("Test");

// The timeline composable and the i18n locale it reads, so a test can switch the language. The app
// is shared between tests, so each starts in English.
async function mountTimeline(build: GraphBuilder, instrument: ReportInstrument | undefined) {
	assert(instrument !== undefined);
	const mounted = await mountComposable(() => ({
		timeline: useInstrumentTimeline(
			() => instrument,
			() => new ProvenanceWalker(build.graph),
		),
		i18n: useI18n(),
	}));
	await mounted.i18n.setLocale("en");
	return mounted;
}

function boughtAndSold(): GraphBuilder {
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
	return b;
}

function dividendAndTax(): GraphBuilder {
	const b = new GraphBuilder();
	const file = b.file({ name: "U1.xml" });
	const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
	const dividend = b.dividend({
		file,
		instrument: tte,
		kind: ProvenanceEventKind.DIVIDEND,
		date: "2024-04-01",
		amount: "20.5",
		currency: "EUR",
		label: "dividend TTE",
	});
	const tax = b.dividend({
		file,
		instrument: tte,
		kind: ProvenanceEventKind.WITHHOLDING_TAX,
		date: "2024-04-01",
		amount: "-3",
		currency: "EUR",
		label: "tax TTE",
	});
	b.sumInto({ instrument: tte, events: [dividend, tax], dateReceived: "2024-04-01" });
	return b;
}

describe("the timeline of the selected instrument", () => {
	test("its marks and bar come from the instrument and the graph", async () => {
		const b = boughtAndSold();
		const { timeline } = await mountTimeline(b, b.reading().stocks[0]);

		expect(timeline.timeline.value.marks).toHaveLength(2);
		expect(timeline.timeline.value.marks[0]?.kind).toEqual(TimelineMarkKind.BOUGHT);
		expect(timeline.timeline.value.marks[1]?.kind).toEqual(TimelineMarkKind.SOLD);
		expect(timeline.timeline.value.bars).toHaveLength(1);
	});
});

describe("the tooltip text of a mark", () => {
	test("a buy says the quantity and the date", async () => {
		const b = boughtAndSold();
		const { timeline } = await mountTimeline(b, b.reading().stocks[0]);
		const mark = timeline.timeline.value.marks[0];
		assert(mark !== undefined);

		expect(timeline.describeMark(mark)).toEqual("Bought 10 on Jan 10, 2024");
	});

	test("a sale says the quantity without its sign", async () => {
		const b = boughtAndSold();
		const { timeline } = await mountTimeline(b, b.reading().stocks[0]);
		const mark = timeline.timeline.value.marks[1];
		assert(mark !== undefined);

		expect(timeline.describeMark(mark)).toEqual("Sold 10 on Mar 10, 2024");
	});

	test("a dividend says its amount and currency", async () => {
		const b = dividendAndTax();
		const { timeline } = await mountTimeline(b, b.reading().dividendPayers[0]);
		const mark = timeline.timeline.value.marks[0];
		assert(mark !== undefined);

		expect(timeline.describeMark(mark)).toEqual("Dividend 20.5 EUR on Apr 1, 2024");
	});

	test("a withholding tax says its amount without its sign", async () => {
		const b = dividendAndTax();
		const { timeline } = await mountTimeline(b, b.reading().dividendPayers[0]);
		const mark = timeline.timeline.value.marks[1];
		assert(mark !== undefined);

		expect(timeline.describeMark(mark)).toEqual("Tax withheld 3 EUR on Apr 1, 2024");
	});

	test("a lot says its quantity and how long it was held", async () => {
		const b = boughtAndSold();
		const { timeline } = await mountTimeline(b, b.reading().stocks[0]);
		const bar = timeline.timeline.value.bars[0];
		assert(bar !== undefined);

		expect(timeline.describeBar(bar)).toEqual("10 · held 2 mths");
	});

	test("what's still open says its quantity", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const zed = b.instrument({ ticker: "ZED", isin: "US0000000009" });
		const buy = b.trade({
			file,
			instrument: zed,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "7",
			currency: "USD",
			label: "buy ZED",
		});
		b.graph.drop(buy.event, DropReason.POSITION_OPEN, stage, null);
		const { timeline } = await mountTimeline(b, b.reading().withoutLines[0]);
		const bar = timeline.timeline.value.bars[0];
		assert(bar !== undefined);

		expect(timeline.describeBar(bar)).toEqual("5 still open");
	});

	test("a lot's text follows the language", async () => {
		const b = boughtAndSold();
		const { timeline, i18n } = await mountTimeline(b, b.reading().stocks[0]);
		const bar = timeline.timeline.value.bars[0];
		assert(bar !== undefined);
		await i18n.setLocale("sl");

		expect(timeline.describeBar(bar)).toEqual("10 · v lasti 2 m");
	});

	test("the text follows the language", async () => {
		const b = boughtAndSold();
		const { timeline, i18n } = await mountTimeline(b, b.reading().stocks[0]);
		const mark = timeline.timeline.value.marks[0];
		assert(mark !== undefined);
		await i18n.setLocale("sl");

		expect(timeline.describeMark(mark)).toEqual("Nakup 10, 10. jan. 2024");
	});
});

// Two lots closed in 2023 and two buys still open: nothing on the form, so both fold.
function closedAndOpen(): GraphBuilder {
	const b = new GraphBuilder();
	const file = b.file({ name: "U1.xml" });
	const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
	const firstBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2023-01-10",
		quantity: "4",
		price: "5",
		currency: "USD",
		label: "first buy",
	});
	const firstSale = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.SOLD,
		date: "2023-03-10",
		quantity: "-4",
		price: "6",
		currency: "USD",
		label: "first sale",
	});
	const first = b.matchClosed({
		instrument: acme,
		acquired: firstBuy,
		sold: firstSale,
		quantity: "4",
	});
	b.graph.drop(first.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	b.graph.drop(first.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	const secondBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2023-02-10",
		quantity: "3",
		price: "5",
		currency: "USD",
		label: "second buy",
	});
	const secondSale = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.SOLD,
		date: "2023-06-10",
		quantity: "-3",
		price: "6",
		currency: "USD",
		label: "second sale",
	});
	const second = b.matchClosed({
		instrument: acme,
		acquired: secondBuy,
		sold: secondSale,
		quantity: "3",
	});
	b.graph.drop(second.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	b.graph.drop(second.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
	const openBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2024-05-01",
		quantity: "5",
		price: "8",
		currency: "USD",
		label: "open buy",
	});
	b.graph.drop(openBuy.event, DropReason.POSITION_OPEN, stage, null);
	const lastBuy = b.trade({
		file,
		instrument: acme,
		kind: ProvenanceEventKind.ACQUIRED,
		date: "2024-06-01",
		quantity: "4",
		price: "8",
		currency: "USD",
		label: "last buy",
	});
	b.graph.drop(lastBuy.event, DropReason.POSITION_OPEN, stage, null);
	return b;
}

describe("what a folded row of the timeline says", () => {
	test("the lots of other years say how many they are, and what is still open its quantity", async () => {
		const b = closedAndOpen();
		const { timeline } = await mountTimeline(b, b.reading().withoutLines[0]);

		const [otherYears, stillOpen] = timelineRows(timeline.timeline.value.bars, false);
		assert(otherYears !== undefined && stillOpen !== undefined);

		expect(timeline.describeRow(otherYears)).toEqual("Closed in other years: 2");
		expect(timeline.describeRow(stillOpen)).toEqual("Still open: 9");
	});

	test("in Slovenian", async () => {
		const b = closedAndOpen();
		const { timeline, i18n } = await mountTimeline(b, b.reading().withoutLines[0]);
		const [otherYears, stillOpen] = timelineRows(timeline.timeline.value.bars, false);
		assert(otherYears !== undefined && stillOpen !== undefined);
		await i18n.setLocale("sl");

		expect(timeline.describeRow(otherYears)).toEqual("Zaprto v drugih letih: 2");
		expect(timeline.describeRow(stillOpen)).toEqual("Še odprto: 9");
	});
});
