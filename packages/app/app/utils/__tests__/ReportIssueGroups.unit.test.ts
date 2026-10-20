import {
	DropReason,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import {
	buildPanel,
	leftOutGroupsOf,
	warningGroupsOf,
	warningItemsOf,
} from "~/utils/instrumentPanel";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the report's problems, grouped by cause for the list a problem button opens", () => {
	test("warnings group by their kind, in the order the kinds first come, each with its instruments", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tteDividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		const tteLine = b.sumInto({
			instrument: tte,
			events: [tteDividend],
			dateReceived: "2024-04-01",
		});
		b.graph.warn(
			tteLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "FR0000120271" },
			}),
		);
		const sap = b.instrument({ ticker: "SAP", isin: "DE0007164600" });
		const sapDividend = b.dividend({
			file,
			instrument: sap,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-05-02",
			amount: "10",
			currency: "EUR",
			label: "dividend SAP",
		});
		const sapLine = b.sumInto({
			instrument: sap,
			events: [sapDividend],
			dateReceived: "2024-05-02",
		});
		b.graph.warn(
			sapLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "DE0007164600",
					[ProvenanceDetailValue.ERROR]: "timeout",
				},
			}),
		);
		const asml = b.instrument({ ticker: "ASML", isin: "NL0010273215" });
		const asmlDividend = b.dividend({
			file,
			instrument: asml,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-06-03",
			amount: "5",
			currency: "EUR",
			label: "dividend ASML",
		});
		const asmlLine = b.sumInto({
			instrument: asml,
			events: [asmlDividend],
			dateReceived: "2024-06-03",
		});
		b.graph.warn(
			asmlLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "NL0010273215" },
			}),
		);
		const reading = b.reading();

		const groups = warningGroupsOf(warningItemsOf(buildPanel(reading), reading.warnings));

		expect(groups).toHaveLength(2);
		expect(groups[0]?.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
		expect(groups[0]?.items).toHaveLength(2);
		expect(groups[0]?.items[0]?.title).toEqual("ASML");
		expect(groups[0]?.items[1]?.title).toEqual("TTE");
		expect(groups[1]?.kind).toEqual(ProvenanceDetailKind.COMPANY_LOOKUP_FAILED);
		expect(groups[1]?.items).toHaveLength(1);
		expect(groups[1]?.items[0]?.title).toEqual("SAP");
	});

	test("what was left out groups by its reason and how it was said, so each asset class is its own group", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const bond1 = {};
		const bond2 = {};
		const future = {};
		b.graph.node(bond1, ProvenanceNodeKind.ROW, "Trade 7 · EDF 2031", {});
		b.graph.node(bond2, ProvenanceNodeKind.ROW, "Trade 8 · EDF 2033", {});
		b.graph.node(future, ProvenanceNodeKind.ROW, "Trade 9 · ES", {});
		b.graph.drop(
			bond1,
			DropReason.NOT_SUPPORTED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
				values: { [ProvenanceDetailValue.ASSET_CLASS]: "BOND" },
			}),
		);
		b.graph.drop(
			future,
			DropReason.NOT_SUPPORTED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
				values: { [ProvenanceDetailValue.ASSET_CLASS]: "FUT" },
			}),
		);
		b.graph.drop(
			bond2,
			DropReason.NOT_SUPPORTED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
				values: { [ProvenanceDetailValue.ASSET_CLASS]: "BOND" },
			}),
		);
		b.graph.drop(file, DropReason.NOT_RECOGNISED, stage, null);

		const groups = leftOutGroupsOf(b.reading().needsALook);

		expect(groups).toHaveLength(3);
		expect(groups[0]?.drop.detail?.values[ProvenanceDetailValue.ASSET_CLASS]).toEqual("BOND");
		expect(groups[0]?.items).toHaveLength(2);
		expect(groups[0]?.items[0]?.subject.label).toEqual("Trade 7 · EDF 2031");
		expect(groups[0]?.items[1]?.subject.label).toEqual("Trade 8 · EDF 2033");
		expect(groups[1]?.drop.detail?.values[ProvenanceDetailValue.ASSET_CLASS]).toEqual("FUT");
		expect(groups[1]?.items).toHaveLength(1);
		expect(groups[2]?.drop.reason).toEqual(DropReason.NOT_RECOGNISED);
		expect(groups[2]?.items[0]?.subject.label).toEqual("U1.xml");
	});
});
