import {
	DropReason,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { ReportInstruments } from "~/utils/reportInstruments";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what the report says about the focused item", () => {
	test("an event that was left out has its drop", () => {
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
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const leftOut = ReportInstruments.leftOutOf(instrument, b.node(buy.event));

		expect(leftOut).toHaveLength(1);
		expect(leftOut[0]?.drop.reason).toEqual(DropReason.POSITION_OPEN);
	});

	test("a matched lot whose two legs were dropped the same way has one drop", () => {
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
		const detail = new ProvenanceDetail({
			kind: ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD,
			values: { [ProvenanceDetailValue.DATE]: "2022-03-10" },
		});
		b.graph.drop(closed.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, detail);
		b.graph.drop(closed.soldLeg, DropReason.OUTSIDE_PERIOD, stage, detail);
		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const leftOut = ReportInstruments.leftOutOf(instrument, b.node(closed.lot));

		expect(leftOut).toHaveLength(1);
		expect(leftOut[0]?.drop.reason).toEqual(DropReason.OUTSIDE_PERIOD);
	});

	test("an item nothing was said about has no drop and no warning", () => {
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
		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		expect(ReportInstruments.leftOutOf(instrument, b.node(sell.event))).toHaveLength(0);
		expect(ReportInstruments.warningsOf(instrument, b.node(sell.event))).toHaveLength(0);
	});

	test("a warning on the focused node is listed", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		const summed = b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });
		b.graph.warn(
			summed.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "FR0000120271" },
			}),
		);
		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const warnings = ReportInstruments.warningsOf(instrument, b.node(summed.line));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	});
});

describe("the item an instrument opens on", () => {
	test("an instrument with a buy and a sale opens on the sale", () => {
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

		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const focus = ReportInstruments.defaultFocus(instrument, new ProvenanceWalker(b.graph));

		expect(focus).toBe(b.node(sell.event));
	});

	test("an instrument with only a buy opens on the buy", () => {
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

		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const focus = ReportInstruments.defaultFocus(instrument, new ProvenanceWalker(b.graph));

		expect(focus).toBe(b.node(buy.event));
	});

	test("a dividend payer opens on the dividend, not the withholding", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tax = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-01",
			amount: "-3",
			currency: "EUR",
			label: "tax TTE",
		});
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [tax, dividend], dateReceived: "2024-04-01" });

		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const focus = ReportInstruments.defaultFocus(instrument, new ProvenanceWalker(b.graph));

		expect(focus).toBe(b.node(dividend.event));
	});
	test("an instrument opens on its first sale on the form, not an earlier sale from another year", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const earlyBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME in 2023",
		});
		const earlySell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME in 2023",
		});
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "7",
			currency: "USD",
			label: "buy ACME in 2024",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "8",
			currency: "USD",
			label: "sell ACME in 2024",
		});
		const early = b.matchClosed({
			instrument: acme,
			acquired: earlyBuy,
			sold: earlySell,
			quantity: "10",
		});
		b.graph.drop(early.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(early.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});

		const [instrument] = b.reading().stocks;
		assert(instrument !== undefined);

		const focus = ReportInstruments.defaultFocus(instrument, new ProvenanceWalker(b.graph));

		expect(focus).toBe(b.node(sell.event));
	});

	test("a dividend payer opens on its first dividend on the form, not an earlier one from another year", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const earlier = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2023-04-01",
			amount: "18",
			currency: "EUR",
			label: "dividend TTE in 2023",
		});
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE in 2024",
		});
		b.graph.drop(earlier.event, DropReason.OUTSIDE_PERIOD, stage, null);
		b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });

		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const focus = ReportInstruments.defaultFocus(instrument, new ProvenanceWalker(b.graph));

		expect(focus).toBe(b.node(dividend.event));
	});
});
