import {
	DropReason,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceStage,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { leftOutOf, warningsOf } from "~/utils/instrumentPanel";

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

		const leftOut = leftOutOf(instrument, b.node(buy.event));

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

		const leftOut = leftOutOf(instrument, b.node(closed.lot));

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

		expect(leftOutOf(instrument, b.node(sell.event))).toHaveLength(0);
		expect(warningsOf(instrument, b.node(sell.event))).toHaveLength(0);
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

		const warnings = warningsOf(instrument, b.node(summed.line));

		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	});
});
