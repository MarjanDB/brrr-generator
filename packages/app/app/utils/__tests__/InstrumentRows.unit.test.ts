import {
	DropReason,
	EDavkiProvenanceField,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { Timelines } from "~/composables/instrumentTimeline/timelines";
import { DetectedReason } from "~/types/instrumentCard";
import { MarkState, TimelineMarkKind } from "~/types/timeline";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import {
	detectedRowStateOf,
	detectedRowsOf,
	formLotsOf,
	formPaymentsOf,
	formTotalOf,
} from "~/utils/instrumentRows";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the rows under an instrument's timeline", () => {
	test("the lots on the form are the timeline's lots on the form, in the order they opened", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const oldBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "5",
			currency: "USD",
			label: "old buy",
		});
		const oldSale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-4",
			price: "6",
			currency: "USD",
			label: "old sale",
		});
		const old = b.matchClosed({ instrument: acme, acquired: oldBuy, sold: oldSale, quantity: "4" });
		b.graph.drop(old.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(old.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const firstBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "3",
			price: "5",
			currency: "USD",
			label: "first buy",
		});
		const secondBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-10",
			quantity: "7",
			price: "5",
			currency: "USD",
			label: "second buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		const second = b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sale,
			quantity: "7",
			boughtOn: "2024-02-10",
			soldOn: "2024-03-10",
		});
		const first = b.match({
			instrument: acme,
			acquired: firstBuy,
			sold: sale,
			quantity: "3",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const lots = formLotsOf(instrument, timeline);

		expect(lots).toHaveLength(2);
		expect(lots[0]?.lot).toBe(b.node(first.lot));
		expect(lots[0]?.bought.node).toBe(b.node(firstBuy.event));
		expect(lots[0]?.sold.node).toBe(b.node(sale.event));
		expect(lots[0]?.bar).toBe(timeline.bars[1]);
		expect(lots[1]?.lot).toBe(b.node(second.lot));
		expect(lots[1]?.bought.node).toBe(b.node(secondBuy.event));
		expect(lots[1]?.sold.node).toBe(b.node(sale.event));
	});

	test("a lot opened by its sale, as a written option is, still has its buy and its sale", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-01-10",
			quantity: "-1",
			price: "2",
			currency: "USD",
			label: "write ACME",
		});
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-03-10",
			quantity: "1",
			price: "0.5",
			currency: "USD",
			label: "buy back ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "1",
			boughtOn: "2024-03-10",
			soldOn: "2024-01-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const lots = formLotsOf(instrument, timeline);

		expect(lots).toHaveLength(1);
		expect(lots[0]?.bar.opened.node).toBe(b.node(sale.event));
		expect(lots[0]?.bought.node).toBe(b.node(buy.event));
		expect(lots[0]?.sold.node).toBe(b.node(sale.event));
	});

	test("a lot on the form has the form's prices per unit and its net change, and the lots add up to a total", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const firstBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "3",
			price: "5.5",
			currency: "USD",
			label: "first buy",
		});
		const secondBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-10",
			quantity: "7",
			price: "8.8",
			currency: "USD",
			label: "second buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "7.7",
			currency: "USD",
			label: "sale",
		});
		b.match({
			instrument: acme,
			acquired: firstBuy,
			sold: sale,
			quantity: "3",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
			boughtLine: {
				[EDavkiProvenanceField.PRICE_PER_UNIT]: "5",
				[EDavkiProvenanceField.TOTAL_PRICE]: "15",
			},
			soldLine: {
				[EDavkiProvenanceField.PRICE_PER_UNIT]: "7",
				[EDavkiProvenanceField.TOTAL_PRICE]: "-21",
			},
		});
		b.match({
			instrument: acme,
			acquired: secondBuy,
			sold: sale,
			quantity: "7",
			boughtOn: "2024-02-10",
			soldOn: "2024-03-10",
			boughtLine: {
				[EDavkiProvenanceField.PRICE_PER_UNIT]: "8",
				[EDavkiProvenanceField.TOTAL_PRICE]: "56",
			},
			soldLine: {
				[EDavkiProvenanceField.PRICE_PER_UNIT]: "7",
				[EDavkiProvenanceField.TOTAL_PRICE]: "-49",
			},
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const lots = formLotsOf(instrument, timeline);

		expect(lots).toHaveLength(2);
		expect(lots[0]?.boughtPrice).toEqual(5);
		expect(lots[0]?.soldPrice).toEqual(7);
		expect(lots[0]?.netChange).toEqual(6);
		expect(lots[1]?.boughtPrice).toEqual(8);
		expect(lots[1]?.soldPrice).toEqual(7);
		expect(lots[1]?.netChange).toEqual(-7);
		expect(formTotalOf(lots)).toEqual(-1);
	});

	test("a lot whose lines carry no prices has no net change, and adds nothing to the total", () => {
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
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const lots = formLotsOf(instrument, timeline);

		expect(lots[0]?.boughtPrice).toBeNull();
		expect(lots[0]?.soldPrice).toBeNull();
		expect(lots[0]?.netChange).toBeNull();
		expect(formTotalOf(lots)).toEqual(0);
	});

	test("a split that rebuilt a trade on the form applies to it", () => {
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
		const sale = b.trade({
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
			sold: sale,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const detected = detectedRowsOf(instrument, timeline, 2024);

		expect(detected[1]?.mark.kind).toEqual(TimelineMarkKind.CORPORATE_ACTION);
		expect(detected[1]?.parts).toEqual([
			{ reason: DetectedReason.APPLIED, quantity: null, years: [] },
		]);
	});

	test("a dividend payer's payments on the form are its dividends and taxes on it, by date", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const oldDividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2023-04-01",
			amount: "18",
			currency: "EUR",
			label: "old dividend",
		});
		b.graph.drop(oldDividend.event, DropReason.OUTSIDE_PERIOD, stage, null);
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend",
		});
		const tax = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-01",
			amount: "-3",
			currency: "EUR",
			label: "tax",
		});
		b.sumInto({ instrument: tte, events: [dividend, tax], dateReceived: "2024-04-01" });
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const payments = formPaymentsOf(timeline);
		const detected = detectedRowsOf(instrument, timeline, 2024);

		expect(payments).toHaveLength(2);
		expect(payments[0]?.node).toBe(b.node(dividend.event));
		expect(payments[1]?.node).toBe(b.node(tax.event));
		expect(detected).toHaveLength(3);
		expect(detected[0]?.mark.node).toBe(b.node(oldDividend.event));
		expect(detected[0]?.parts).toEqual([
			{ reason: DetectedReason.PAID_OUTSIDE_YEAR, quantity: null, years: [2023] },
		]);
		expect(detected[0]?.leftOut).toHaveLength(1);
		expect(detected[0]?.leftOut[0]?.drop.reason).toEqual(DropReason.OUTSIDE_PERIOD);
		expect(detected[1]?.parts).toEqual([
			{ reason: DetectedReason.REPORTED, quantity: null, years: [] },
		]);
		expect(detected[1]?.leftOut).toHaveLength(0);
		expect(detected[2]?.parts).toEqual([
			{ reason: DetectedReason.REPORTED, quantity: null, years: [] },
		]);
	});

	test("everything detected is every trade and broker lot by date, each with why it is or isn't on the form", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const oldBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "5",
			currency: "USD",
			label: "old buy",
		});
		const oldSale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-4",
			price: "6",
			currency: "USD",
			label: "old sale",
		});
		const old = b.matchClosed({ instrument: acme, acquired: oldBuy, sold: oldSale, quantity: "4" });
		b.graph.drop(old.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(old.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-6",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "6",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const lastBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "8",
			currency: "USD",
			label: "last buy",
		});
		b.graph.drop(lastBuy.event, DropReason.POSITION_OPEN, stage, null);
		const brokerLot = {};
		b.graph.node(brokerLot, ProvenanceNodeKind.LOT, "lot ACME", {
			[ProvenanceField.ACQUIRED_DATE]: "2024-01-10",
			[ProvenanceField.QUANTITY]: "10",
		});
		b.graph.derive([brokerLot], acme, ProvenanceChange.GROUPED, stage, null);
		b.graph.drop(brokerLot, DropReason.NOT_USED, stage, null);
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const detected = detectedRowsOf(instrument, timeline, 2024);

		expect(detected).toHaveLength(6);
		expect(detected[0]?.mark.node).toBe(b.node(oldBuy.event));
		expect(detected[0]?.parts).toEqual([
			{ reason: DetectedReason.CLOSED_BEFORE_YEAR, quantity: 4, years: [2023] },
		]);
		expect(detected[1]?.mark.node).toBe(b.node(oldSale.event));
		expect(detected[1]?.parts).toEqual([
			{ reason: DetectedReason.CLOSED_BEFORE_YEAR, quantity: 4, years: [2023] },
		]);
		expect(detected[2]?.mark.node).toBe(b.node(buy.event));
		expect(detected[2]?.parts).toEqual([
			{ reason: DetectedReason.REPORTED, quantity: 6, years: [] },
			{ reason: DetectedReason.STILL_OPEN, quantity: 4, years: [] },
		]);
		expect(detected[3]?.mark.node).toBe(b.node(brokerLot));
		expect(detected[3]?.parts).toEqual([
			{ reason: DetectedReason.LEFT_OUT, quantity: null, years: [] },
		]);
		expect(detected[3]?.leftOut).toHaveLength(1);
		expect(detected[3]?.leftOut[0]?.drop.reason).toEqual(DropReason.NOT_USED);
		expect(detected[4]?.mark.node).toBe(b.node(sale.event));
		expect(detected[4]?.parts).toEqual([
			{ reason: DetectedReason.REPORTED, quantity: 6, years: [] },
		]);
		expect(detected[5]?.mark.node).toBe(b.node(lastBuy.event));
		expect(detected[5]?.parts).toEqual([
			{ reason: DetectedReason.STILL_OPEN, quantity: 5, years: [] },
		]);
		expect(detected[5]?.leftOut).toHaveLength(1);
		expect(detected[5]?.leftOut[0]?.drop.reason).toEqual(DropReason.POSITION_OPEN);
	});

	test("a buy partly in a lot closed before the tax year and partly still open says how much of it is which", () => {
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
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-6",
			price: "6",
			currency: "USD",
			label: "sale",
		});
		const closed = b.matchClosed({ instrument: acme, acquired: buy, sold: sale, quantity: "6" });
		b.graph.drop(closed.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(closed.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const before = detectedRowsOf(instrument, timeline, 2024);
		const after = detectedRowsOf(instrument, timeline, 2022);

		expect(before).toHaveLength(2);
		expect(before[0]?.mark.node).toBe(b.node(buy.event));
		expect(before[0]?.parts).toEqual([
			{ reason: DetectedReason.CLOSED_BEFORE_YEAR, quantity: 6, years: [2023] },
			{ reason: DetectedReason.STILL_OPEN, quantity: 4, years: [] },
		]);
		expect(before[0]?.leftOut).toHaveLength(0);
		expect(before[1]?.mark.node).toBe(b.node(sale.event));
		expect(before[1]?.parts).toEqual([
			{ reason: DetectedReason.CLOSED_BEFORE_YEAR, quantity: 6, years: [2023] },
		]);
		expect(after[0]?.parts).toEqual([
			{ reason: DetectedReason.CLOSED_AFTER_YEAR, quantity: 6, years: [2023] },
			{ reason: DetectedReason.STILL_OPEN, quantity: 4, years: [] },
		]);
		expect(formLotsOf(instrument, timeline)).toHaveLength(0);
	});

	test("a split that changed no lot on the form has no effect on it", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const oldAcme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: oldAcme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "buy ACME",
		});
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
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
			date: "2023-02-01",
		});
		b.graph.derive([oldAcme, split.action], acme, ProvenanceChange.SPLIT, stage, null);
		const closed = b.matchClosed({
			instrument: acme,
			acquired: { row: buy.row, record: buy.record, staged: buy.staged, event: split.rebuilt },
			sold: sale,
			quantity: "40",
		});
		b.graph.drop(closed.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(closed.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));

		const detected = detectedRowsOf(instrument, timeline, 2024);

		expect(detected).toHaveLength(3);
		expect(detected[1]?.mark.kind).toEqual(TimelineMarkKind.CORPORATE_ACTION);
		expect(detected[1]?.mark.node).toBe(b.node(split.action));
		expect(detected[1]?.parts).toEqual([
			{ reason: DetectedReason.NO_EFFECT, quantity: null, years: [] },
		]);
		expect(detected[1]?.leftOut).toHaveLength(0);
	});

	test("a focused lot lights the rows of its buy and its sale, the ends of its bar", () => {
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
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);
		const timeline = Timelines.build(instrument, new ProvenanceWalker(b.graph));
		const [bought, sold] = timeline.marks;
		assert(bought !== undefined && sold !== undefined);

		expect(detectedRowStateOf(bought, timeline, b.node(match.lot), null)).toEqual(MarkState.LIT);
		expect(detectedRowStateOf(sold, timeline, b.node(match.lot), null)).toEqual(MarkState.LIT);
		expect(detectedRowStateOf(bought, timeline, b.node(buy.event), null)).toEqual(
			MarkState.FOCUSED,
		);
		expect(detectedRowStateOf(sold, timeline, b.node(buy.event), null)).toEqual(MarkState.NORMAL);
	});
});
