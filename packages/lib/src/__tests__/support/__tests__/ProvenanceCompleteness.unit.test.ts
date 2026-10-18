import { linesFromNowhere, rowsGoingNowhere } from "@brrr/__tests__/support/ProvenanceCompleteness";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";

const stage = ProvenanceStage.Schema.parse("Test");

test("a row that reaches a line only through a grouping goes nowhere, and so does the line", () => {
	const imported = new ProvenanceGraph({ parent: null });
	const file = {};
	const rowA = {};
	const rowB = {};
	const eventA = {};
	const eventB = {};
	const grouping = {};
	imported.node(file, ProvenanceNodeKind.FILE, "trades.xml", {});
	imported.node(rowA, ProvenanceNodeKind.ROW, "Trade A", {});
	imported.node(rowB, ProvenanceNodeKind.ROW, "Trade B", {});
	imported.node(eventA, ProvenanceNodeKind.EVENT, "buy A", {});
	imported.node(eventB, ProvenanceNodeKind.EVENT, "buy B", {});
	imported.node(grouping, ProvenanceNodeKind.GROUPING, "grouping", {});
	imported.derive([file], rowA, ProvenanceChange.CONTAINS, stage, null);
	imported.derive([file], rowB, ProvenanceChange.CONTAINS, stage, null);
	imported.derive([rowA], eventA, ProvenanceChange.TRANSFORMED, stage, null);
	imported.derive([rowB], eventB, ProvenanceChange.TRANSFORMED, stage, null);
	imported.derive([eventA, eventB], grouping, ProvenanceChange.GROUPED, stage, null);
	const report = imported.layer();
	const line = {};
	report.node(line, ProvenanceNodeKind.REPORT_LINE, "KDVP line", {});
	report.derive([grouping], line, ProvenanceChange.REPORTED, stage, null);

	expect(rowsGoingNowhere(imported, [report])).toEqual(["Trade A", "Trade B"]);
	expect(linesFromNowhere([report])).toEqual(["KDVP line"]);
});

test("a row that reaches a line through a matched lot does not go nowhere, its neighbour in the grouping still does", () => {
	const imported = new ProvenanceGraph({ parent: null });
	const file = {};
	const rowA = {};
	const rowB = {};
	const eventA = {};
	const eventB = {};
	const grouping = {};
	imported.node(file, ProvenanceNodeKind.FILE, "trades.xml", {});
	imported.node(rowA, ProvenanceNodeKind.ROW, "Trade A", {});
	imported.node(rowB, ProvenanceNodeKind.ROW, "Trade B", {});
	imported.node(eventA, ProvenanceNodeKind.EVENT, "buy A", {});
	imported.node(eventB, ProvenanceNodeKind.EVENT, "buy B", {});
	imported.node(grouping, ProvenanceNodeKind.GROUPING, "grouping", {});
	imported.derive([file], rowA, ProvenanceChange.CONTAINS, stage, null);
	imported.derive([file], rowB, ProvenanceChange.CONTAINS, stage, null);
	imported.derive([rowA], eventA, ProvenanceChange.TRANSFORMED, stage, null);
	imported.derive([rowB], eventB, ProvenanceChange.TRANSFORMED, stage, null);
	imported.derive([eventA, eventB], grouping, ProvenanceChange.GROUPED, stage, null);
	const report = imported.layer();
	const lot = {};
	const leg = {};
	const line = {};
	report.node(lot, ProvenanceNodeKind.MATCHED_LOT, "matched lot", {});
	report.node(leg, ProvenanceNodeKind.LEG, "leg", {});
	report.node(line, ProvenanceNodeKind.REPORT_LINE, "KDVP line", {});
	report.derive([eventA], lot, ProvenanceChange.MATCHED, stage, null);
	report.derive([lot], leg, ProvenanceChange.MATCHED, stage, null);
	report.derive([leg, grouping], line, ProvenanceChange.REPORTED, stage, null);

	expect(rowsGoingNowhere(imported, [report])).toEqual(["Trade B"]);
	expect(linesFromNowhere([report])).toEqual([]);
});
