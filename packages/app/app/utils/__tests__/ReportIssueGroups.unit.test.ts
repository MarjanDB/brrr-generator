import {
	DropReason,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceNodeKind,
	ProvenanceStage,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { ReportInstruments } from "~/utils/reportInstruments";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what the report left out, grouped by cause for the problems view", () => {
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

		const groups = ReportInstruments.leftOutGroupsOf(b.reading().needsALook);

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
