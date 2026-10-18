import {
	DropReason,
	ProvenanceChange,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceGraph,
	ProvenanceNodeKind,
	ProvenanceReportReader,
	ProvenanceStage,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { ImportSources } from "~/review/ImportSources";
import { readImportLeftOut } from "~/review/readImportLeftOut";

const stage = ProvenanceStage.Schema.parse("Test");

describe("what the import left out and what it counted once", () => {
	test("the import's drops become one line per sentence, by reason, each with the files and rows behind it", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const other = {};
		const file = {};
		const futureOne = {};
		const futureTwo = {};
		const cash = {};
		const actionRow = {};
		const actionRecord = {};
		const half = {};
		graph.node(other, ProvenanceNodeKind.FILE, "other.xml", {});
		graph.node(file, ProvenanceNodeKind.FILE, "U1.xml", {});
		graph.node(futureOne, ProvenanceNodeKind.ROW, "Trade 7 · ES", { assetCategory: "FUT" });
		graph.node(futureTwo, ProvenanceNodeKind.ROW, "Trade 8 · ES", { assetCategory: "FUT" });
		graph.node(cash, ProvenanceNodeKind.ROW, "Trade 9 · EUR.USD", { assetCategory: "CASH" });
		graph.node(actionRow, ProvenanceNodeKind.ROW, "CorporateAction 5 · TORO", {
			transactionID: "5",
		});
		graph.node(actionRecord, ProvenanceNodeKind.RECORD, "CorporateAction 5", {});
		graph.node(
			half,
			ProvenanceNodeKind.STAGING_CORPORATE_ACTION,
			"corporate action 4 · to TORO",
			{},
		);
		graph.derive([file], futureOne, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([file], futureTwo, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([file], cash, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([file], actionRow, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([actionRow], actionRecord, ProvenanceChange.PARSED, stage, null);
		graph.derive([actionRecord], half, ProvenanceChange.TRANSFORMED, stage, null);
		const future = new ProvenanceDetail({
			kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
			values: { [ProvenanceDetailValue.ASSET_CLASS]: "FUT" },
		});
		graph.drop(futureOne, DropReason.NOT_SUPPORTED, stage, future);
		graph.drop(
			cash,
			DropReason.NOT_SUPPORTED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
				values: { [ProvenanceDetailValue.ASSET_CLASS]: "CASH" },
			}),
		);
		graph.drop(futureTwo, DropReason.NOT_SUPPORTED, stage, future);
		graph.drop(other, DropReason.NOT_RECOGNISED, stage, null);
		graph.drop(half, DropReason.UNPAIRED, stage, null);

		const leftOut = readImportLeftOut(
			new ProvenanceReportReader().read(graph),
			new ImportSources(graph),
		);

		expect(leftOut.needsALook).toEqual(5);
		expect(leftOut.merged).toHaveLength(0);
		expect(leftOut.lines).toHaveLength(4);
		expect(leftOut.lines[0]?.drop.reason).toEqual(DropReason.NOT_RECOGNISED);
		expect(leftOut.lines[0]?.files).toEqual(["other.xml"]);
		expect(leftOut.lines[0]?.rows).toHaveLength(0);
		expect(leftOut.lines[1]?.drop.detail?.values[ProvenanceDetailValue.ASSET_CLASS]).toEqual("FUT");
		expect(leftOut.lines[1]?.rows).toHaveLength(2);
		expect(leftOut.lines[1]?.rows[0]?.row).toBe(graph.nodeOf(futureOne));
		expect(leftOut.lines[1]?.rows[1]?.row).toBe(graph.nodeOf(futureTwo));
		expect(leftOut.lines[1]?.rows[0]?.fileName).toEqual("U1.xml");
		expect(leftOut.lines[2]?.drop.detail?.values[ProvenanceDetailValue.ASSET_CLASS]).toEqual(
			"CASH",
		);
		expect(leftOut.lines[2]?.rows).toHaveLength(1);
		expect(leftOut.lines[3]?.drop.reason).toEqual(DropReason.UNPAIRED);
		expect(leftOut.lines[3]?.rows).toHaveLength(1);
		expect(leftOut.lines[3]?.rows[0]?.row).toBe(graph.nodeOf(actionRow));
		expect(leftOut.lines[3]?.files).toHaveLength(0);
	});

	test("a trade in two exports is counted once, not left out", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const first = {};
		const second = {};
		const firstRow = {};
		const firstRecord = {};
		const secondRow = {};
		const secondRecord = {};
		graph.node(first, ProvenanceNodeKind.FILE, "FirstDownload.xml", {});
		graph.node(second, ProvenanceNodeKind.FILE, "SecondDownload.xml", {});
		graph.node(firstRow, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(firstRecord, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(secondRow, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(secondRecord, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.derive([first], firstRow, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([firstRow], firstRecord, ProvenanceChange.PARSED, stage, null);
		graph.derive([second], secondRow, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([secondRow], secondRecord, ProvenanceChange.PARSED, stage, null);
		graph.derive([firstRecord], secondRecord, ProvenanceChange.DEDUPLICATED, stage, null);

		const leftOut = readImportLeftOut(
			new ProvenanceReportReader().read(graph),
			new ImportSources(graph),
		);

		expect(leftOut.lines).toHaveLength(0);
		expect(leftOut.needsALook).toEqual(0);
		expect(leftOut.merged).toHaveLength(1);
		expect(leftOut.merged[0]?.row.fileName).toEqual("SecondDownload.xml");
	});

	test("a report made from the import changes nothing the review step reads", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const file = {};
		const row = {};
		const record = {};
		const staged = {};
		const event = {};
		graph.node(file, ProvenanceNodeKind.FILE, "U1.xml", {});
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(record, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(staged, ProvenanceNodeKind.STAGING_EVENT, "stock bought 1 · 10 ACME", {});
		graph.node(event, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});
		graph.derive([file], row, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([row], record, ProvenanceChange.PARSED, stage, null);
		graph.derive([record], staged, ProvenanceChange.TRANSFORMED, stage, null);
		graph.derive([staged], event, ProvenanceChange.CONVERTED, stage, null);
		const layer = graph.layer();
		const line = {};
		layer.node(line, ProvenanceNodeKind.REPORT_LINE, "line 1", {});
		layer.derive([event], line, ProvenanceChange.REPORTED, stage, null);
		layer.drop(event, DropReason.POSITION_OPEN, stage, null);

		const leftOut = readImportLeftOut(
			new ProvenanceReportReader().read(graph),
			new ImportSources(graph),
		);

		expect(leftOut.lines).toHaveLength(0);
		expect(leftOut.needsALook).toEqual(0);
		expect(leftOut.merged).toHaveLength(0);
		expect(new ImportSources(graph).of(event).row.fileName).toEqual("U1.xml");
	});
});
