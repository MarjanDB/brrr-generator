import {
	OptionRight,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceStage,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { buildPanel } from "~/download/panel/buildPanel";
import { warningItemsOf } from "~/download/panel/warningItems";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the warnings of a report, each with the instrument it is about", () => {
	test("a contract's warning is titled with its OCC symbol and a payer's with its ticker", () => {
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
		const call = b.optionContract({
			occSymbol: "SPX   240621C04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.CALL,
		});
		const callBuy = b.trade({
			file,
			instrument: call,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "1",
			price: "50",
			currency: "USD",
			label: "buy SPX call",
		});
		const callSell = b.trade({
			file,
			instrument: call,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-20",
			quantity: "-1",
			price: "60",
			currency: "USD",
			label: "sell SPX call",
		});
		const match = b.match({
			instrument: call,
			acquired: callBuy,
			sold: callSell,
			quantity: "1",
			boughtOn: "2024-02-01",
			soldOn: "2024-02-20",
		});
		b.graph.warn(
			match.soldLine,
			stage,
			new ProvenanceDetail({ kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS, values: {} }),
		);

		const items = warningItemsOf(buildPanel(b.reading()));

		expect(items).toHaveLength(2);
		expect(items[0]?.title).toEqual("SPX   240621C04900000");
		expect(items[0]?.warning.detail.kind).toEqual(ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS);
		expect(items[1]?.title).toEqual("TTE");
		expect(items[1]?.warning.detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	});
});
