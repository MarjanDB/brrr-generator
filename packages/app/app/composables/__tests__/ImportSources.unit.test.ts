import { ProvenanceChange, ProvenanceGraph, ProvenanceNodeKind, ProvenanceStage } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { shallowRef } from "vue";
import {
	mountComposable,
	mountComposableUnder,
} from "~/composables/__tests__/support/mountComposable";
import { provideImportSources, useImportSources } from "~/composables/useImportSources";
import { RowSourceKind } from "~/types/importSources";

const stage = ProvenanceStage.Schema.parse("Test");

describe("where an imported event came from", () => {
	test("a trade came from the broker row its record was parsed from, in its file", async () => {
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

		const sources = (await mountComposable(() => provideImportSources(() => graph))).of(event);

		expect(sources.row.row).toBe(graph.nodeOf(row));
		expect(sources.row.fileName).toEqual("U1.xml");
		expect(sources.alsoIn).toHaveLength(0);
	});

	test("a trade in two exports was taken from the row lib kept, and the other is a copy counted once", async () => {
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

		const sources = (await mountComposable(() => provideImportSources(() => graph))).of(event);

		expect(sources.row.row).toBe(graph.nodeOf(secondRow));
		expect(sources.row.fileName).toEqual("SecondDownload.xml");
		expect(sources.alsoIn).toHaveLength(1);
		expect(sources.alsoIn[0]?.row).toBe(graph.nodeOf(firstRow));
		expect(sources.alsoIn[0]?.fileName).toEqual("FirstDownload.xml");
	});

	test("merged lists each record found in more than one export, with every copy", async () => {
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

		const merged = (await mountComposable(() => provideImportSources(() => graph))).merged.value;

		expect(merged).toHaveLength(1);
		expect(merged[0]?.row.fileName).toEqual("C.xml");
		expect(merged[0]?.alsoIn).toHaveLength(2);
		expect(merged[0]?.alsoIn[0]?.fileName).toEqual("A.xml");
		expect(merged[0]?.alsoIn[1]?.fileName).toEqual("B.xml");
	});

	test("behind lists the broker rows in a node's ancestry, itself included", async () => {
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
		const sources = await mountComposable(() => provideImportSources(() => graph));

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

	test("a node with no broker row above it has no sources", async () => {
		const graph = new ProvenanceGraph({ parent: null });
		const event = {};
		graph.node(event, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});

		const sources = await mountComposable(() => provideImportSources(() => graph));

		expect(() => sources.of(event)).toThrow("Provenance: no broker row behind this node");
	});

	test("a new graph is read afresh", async () => {
		const first = new ProvenanceGraph({ parent: null });
		const firstFile = {};
		const firstRow = {};
		const firstEvent = {};
		first.node(firstFile, ProvenanceNodeKind.FILE, "U1.xml", {});
		first.node(firstRow, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		first.node(firstEvent, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});
		first.derive([firstFile], firstRow, ProvenanceChange.CONTAINS, stage, null);
		first.derive([firstRow], firstEvent, ProvenanceChange.CONVERTED, stage, null);
		const second = new ProvenanceGraph({ parent: null });
		const secondFile = {};
		const secondRow = {};
		const secondEvent = {};
		second.node(secondFile, ProvenanceNodeKind.FILE, "U2.xml", {});
		second.node(secondRow, ProvenanceNodeKind.ROW, "Trade 2 · ACME", { transactionID: "2" });
		second.node(secondEvent, ProvenanceNodeKind.EVENT, "stock bought 2 · 10 ACME", {});
		second.derive([secondFile], secondRow, ProvenanceChange.CONTAINS, stage, null);
		second.derive([secondRow], secondEvent, ProvenanceChange.CONVERTED, stage, null);
		const graph = shallowRef(first);
		const sources = await mountComposable(() => provideImportSources(() => graph.value));

		const fromFirst = sources.of(firstEvent);
		graph.value = second;
		const fromSecond = sources.of(secondEvent);

		expect(fromFirst.row.fileName).toEqual("U1.xml");
		expect(fromSecond.row.row).toBe(second.nodeOf(secondRow));
		expect(fromSecond.row.fileName).toEqual("U2.xml");
	});
});

describe("handing the import sources to the components below", () => {
	test("a component below the one that provided them reads the same import", async () => {
		const graph = new ProvenanceGraph({ parent: null });
		const file = {};
		const row = {};
		const event = {};
		graph.node(file, ProvenanceNodeKind.FILE, "U1.xml", {});
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 1 · ACME", { transactionID: "1" });
		graph.node(event, ProvenanceNodeKind.EVENT, "stock bought 1 · 10 ACME", {});
		graph.derive([file], row, ProvenanceChange.CONTAINS, stage, null);
		graph.derive([row], event, ProvenanceChange.CONVERTED, stage, null);

		const sources = await mountComposableUnder(
			() => provideImportSources(() => graph),
			() => useImportSources(),
		);

		expect(sources.of(event).row.row).toBe(graph.nodeOf(row));
		expect(sources.of(event).row.fileName).toEqual("U1.xml");
	});

	test("a component with nothing above it that provided them can't read them", async () => {
		await expect(mountComposable(() => useImportSources())).rejects.toThrow(
			"useImportSources: no ancestor called provideImportSources",
		);
	});
});

describe("a broker row's attributes", () => {
	test("a trade's key attributes come in the listed order, skipping one the row lacks and keeping an empty one", async () => {
		const graph = new ProvenanceGraph({ parent: null });
		const row = {};
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 7 · ACME", {
			accountId: "FakeAccountId",
			currency: "USD",
			tradePrice: "5",
			quantity: "10",
			buySell: "BUY",
			tradeDate: "2024-01-10",
			ibCommission: "",
		});
		const sources = await mountComposable(() => provideImportSources(() => graph));

		const keys = sources.keyAttributesOf(graph.nodeOf(row), RowSourceKind.TRADE);

		expect(keys).toHaveLength(6);
		expect(keys[0]).toEqual({ name: "tradeDate", value: "2024-01-10" });
		expect(keys[1]).toEqual({ name: "buySell", value: "BUY" });
		expect(keys[2]).toEqual({ name: "quantity", value: "10" });
		expect(keys[3]).toEqual({ name: "tradePrice", value: "5" });
		expect(keys[4]).toEqual({ name: "currency", value: "USD" });
		expect(keys[5]).toEqual({ name: "ibCommission", value: "" });
	});

	test("a cash transaction's key attributes are its date, type, amount, currency, description and ids", async () => {
		const graph = new ProvenanceGraph({ parent: null });
		const row = {};
		graph.node(row, ProvenanceNodeKind.ROW, "Dividend 9 · ACME", {
			accountId: "FakeAccountId",
			transactionID: "9",
			actionID: "77",
			description: "ACME CASH DIVIDEND",
			currency: "USD",
			amount: "12.5",
			type: "Dividends",
			dateTime: "2024-03-01",
		});
		const sources = await mountComposable(() => provideImportSources(() => graph));

		const keys = sources.keyAttributesOf(graph.nodeOf(row), RowSourceKind.CASH_TRANSACTION);

		expect(keys).toHaveLength(7);
		expect(keys[0]).toEqual({ name: "dateTime", value: "2024-03-01" });
		expect(keys[1]).toEqual({ name: "type", value: "Dividends" });
		expect(keys[2]).toEqual({ name: "amount", value: "12.5" });
		expect(keys[3]).toEqual({ name: "currency", value: "USD" });
		expect(keys[4]).toEqual({ name: "description", value: "ACME CASH DIVIDEND" });
		expect(keys[5]).toEqual({ name: "actionID", value: "77" });
		expect(keys[6]).toEqual({ name: "transactionID", value: "9" });
	});

	test("all attributes are every field, by name", async () => {
		const graph = new ProvenanceGraph({ parent: null });
		const row = {};
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 7 · ACME", {
			accountId: "FakeAccountId",
			currency: "USD",
			tradePrice: "5",
			quantity: "10",
			buySell: "BUY",
			tradeDate: "2024-01-10",
			ibCommission: "",
		});
		const sources = await mountComposable(() => provideImportSources(() => graph));

		const all = sources.allAttributesOf(graph.nodeOf(row));

		expect(all).toHaveLength(7);
		expect(all[0]?.name).toEqual("accountId");
		expect(all[1]?.name).toEqual("buySell");
		expect(all[2]?.name).toEqual("currency");
		expect(all[3]?.name).toEqual("ibCommission");
		expect(all[4]?.name).toEqual("quantity");
		expect(all[5]?.name).toEqual("tradeDate");
		expect(all[6]?.name).toEqual("tradePrice");
	});
});
