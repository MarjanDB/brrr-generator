import { ProvenanceChange, ProvenanceGraph, ProvenanceNodeKind, ProvenanceStage } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { ImportSources } from "~/review/ImportSources";

const stage = ProvenanceStage.Schema.parse("Test");

describe("where an imported event came from", () => {
	test("a trade came from the broker row its record was parsed from, in its file", () => {
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

		const sources = new ImportSources(graph).of(event);

		expect(sources.row.row).toBe(graph.nodeOf(row));
		expect(sources.row.fileName).toEqual("U1.xml");
		expect(sources.alsoIn).toHaveLength(0);
	});

	test("a trade in two exports was taken from the row lib kept, and the other is a copy counted once", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const first = {};
		const second = {};
		const firstRow = {};
		const firstRecord = {};
		const secondRow = {};
		const secondRecord = {};
		const staged = {};
		const event = {};
		graph.node(first, ProvenanceNodeKind.FILE, "FirstDownload.xml", {});
		graph.node(second, ProvenanceNodeKind.FILE, "SecondDownload.xml", {});
		graph.node(firstRow, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(firstRecord, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(secondRow, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(secondRecord, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(staged, ProvenanceNodeKind.STAGING_EVENT, "stock bought 1 · 10 ACME", {});
		graph.node(event, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});
		graph.derive([first], firstRow, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([firstRow], firstRecord, ProvenanceChange.PARSED, stage, null);
		graph.derive([second], secondRow, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([secondRow], secondRecord, ProvenanceChange.PARSED, stage, null);
		graph.derive([firstRecord], secondRecord, ProvenanceChange.DEDUPLICATED, stage, null);
		graph.derive([secondRecord], staged, ProvenanceChange.TRANSFORMED, stage, null);
		graph.derive([staged], event, ProvenanceChange.CONVERTED, stage, null);

		const sources = new ImportSources(graph).of(event);

		expect(sources.row.row).toBe(graph.nodeOf(secondRow));
		expect(sources.row.fileName).toEqual("SecondDownload.xml");
		expect(sources.alsoIn).toHaveLength(1);
		expect(sources.alsoIn[0]?.row).toBe(graph.nodeOf(firstRow));
		expect(sources.alsoIn[0]?.fileName).toEqual("FirstDownload.xml");
	});

	test("merged lists each record found in more than one export, with every copy", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const fileA = {};
		const fileB = {};
		const fileC = {};
		const rowA1 = {};
		const rowB1 = {};
		const rowC1 = {};
		const rowA2 = {};
		const recordA1 = {};
		const recordB1 = {};
		const recordC1 = {};
		const recordA2 = {};
		graph.node(fileA, ProvenanceNodeKind.FILE, "A.xml", {});
		graph.node(fileB, ProvenanceNodeKind.FILE, "B.xml", {});
		graph.node(fileC, ProvenanceNodeKind.FILE, "C.xml", {});
		graph.node(rowA1, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(recordA1, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(rowA2, ProvenanceNodeKind.ROW, "Trade 2 · ACME", { transactionID: "2" });
		graph.node(recordA2, ProvenanceNodeKind.RECORD, "TradeStock 2", {});
		graph.node(rowB1, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(recordB1, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.node(rowC1, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(recordC1, ProvenanceNodeKind.RECORD, "TradeStock 1", {});
		graph.derive([fileA], rowA1, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([fileA], rowA2, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([fileB], rowB1, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([fileC], rowC1, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([rowA1], recordA1, ProvenanceChange.PARSED, stage, null);
		graph.derive([rowA2], recordA2, ProvenanceChange.PARSED, stage, null);
		graph.derive([rowB1], recordB1, ProvenanceChange.PARSED, stage, null);
		graph.derive([rowC1], recordC1, ProvenanceChange.PARSED, stage, null);
		graph.derive([recordA1, recordB1], recordC1, ProvenanceChange.DEDUPLICATED, stage, null);

		const merged = new ImportSources(graph).merged();

		expect(merged).toHaveLength(1);
		expect(merged[0]?.row.fileName).toEqual("C.xml");
		expect(merged[0]?.alsoIn).toHaveLength(2);
		expect(merged[0]?.alsoIn[0]?.fileName).toEqual("A.xml");
		expect(merged[0]?.alsoIn[1]?.fileName).toEqual("B.xml");
	});

	test("behind lists the broker rows in a node's ancestry, itself included", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const file = {};
		const other = {};
		const row = {};
		const record = {};
		const lot = {};
		graph.node(file, ProvenanceNodeKind.FILE, "U1.xml", {});
		graph.node(other, ProvenanceNodeKind.FILE, "other.xml", {});
		graph.node(row, ProvenanceNodeKind.ROW, "Lot 1 · ACME", {});
		graph.node(record, ProvenanceNodeKind.RECORD, "Lot 1", {});
		graph.node(lot, ProvenanceNodeKind.STAGING_LOT, "lot 1 · ACME", {});
		graph.derive([file], row, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([row], record, ProvenanceChange.PARSED, stage, null);
		graph.derive([record], lot, ProvenanceChange.TRANSFORMED, stage, null);
		const sources = new ImportSources(graph);

		const fromLot = sources.behind(graph.nodeOf(lot));
		const fromRow = sources.behind(graph.nodeOf(row));
		const fromFile = sources.behind(graph.nodeOf(other));

		expect(fromLot).toHaveLength(1);
		expect(fromLot[0]?.row).toBe(graph.nodeOf(row));
		expect(fromLot[0]?.fileName).toEqual("U1.xml");
		expect(fromRow).toHaveLength(1);
		expect(fromRow[0]?.row).toBe(graph.nodeOf(row));
		expect(fromFile).toHaveLength(0);
	});

	test("a node with no broker row above it has no sources", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const event = {};
		graph.node(event, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});

		expect(() => new ImportSources(graph).of(event)).toThrow(
			"Provenance: no broker row behind this node",
		);
	});
});
