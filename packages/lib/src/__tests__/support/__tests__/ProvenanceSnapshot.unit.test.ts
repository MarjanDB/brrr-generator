import { renderProvenance } from "@brrr/__tests__/support/ProvenanceSnapshot";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";

const stage = ProvenanceStage.Schema.parse("Test");

test("a graph renders as its nodes with their parents, then its drops and warnings", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const file = {};
	const kept = {};
	const dropped = {};
	graph.node(file, ProvenanceNodeKind.FILE, "trades.xml", {});
	graph.node(kept, ProvenanceNodeKind.ROW, "Trade 1001 · ACME", {});
	graph.node(dropped, ProvenanceNodeKind.ROW, "Trade 1003 · ES", {});
	graph.derive([file], kept, ProvenanceChange.CONTAINS, stage, null);
	graph.derive([file], dropped, ProvenanceChange.CONTAINS, stage, "first statement");
	graph.drop(
		dropped,
		DropReason.NOT_SUPPORTED,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
			values: { [ProvenanceDetailValue.ASSET_CLASS]: "FUT" },
		}),
	);
	graph.warn(
		kept,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
			values: { [ProvenanceDetailValue.ISIN]: "US0000000001" },
		}),
	);

	expect(renderProvenance(graph)).toEqual(
		[
			"n1 FILE trades.xml",
			"n2 ROW Trade 1001 · ACME",
			"  ← n1 CONTAINS by Test",
			"n3 ROW Trade 1003 · ES",
			"  ← n1 CONTAINS by Test (first statement)",
			"",
			"Dropped:",
			"n3 NOT_SUPPORTED by Test (ASSET_CLASS_NOT_SUPPORTED ASSET_CLASS=FUT)",
			"",
			"Warnings:",
			"n2 by Test: COMPANY_NOT_FOUND ISIN=US0000000001",
			"",
		].join("\n"),
	);
});

test("a detail with several values renders them sorted by name, and one with none renders its kind alone", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const lot = {};
	const line = {};
	graph.node(lot, ProvenanceNodeKind.LOT, "lot L1 · 5 EDF", {});
	graph.node(line, ProvenanceNodeKind.REPORT_LINE, "DOH_DIV line", {});
	graph.drop(
		lot,
		DropReason.NOT_USED,
		stage,
		new ProvenanceDetail({ kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS, values: {} }),
	);
	graph.warn(
		line,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
			values: {
				[ProvenanceDetailValue.ISIN]: "US1",
				[ProvenanceDetailValue.ERROR]: 'offline "again"',
			},
		}),
	);

	expect(renderProvenance(graph)).toEqual(
		[
			"n1 LOT lot L1 · 5 EDF",
			"n2 REPORT_LINE DOH_DIV line",
			"",
			"Dropped:",
			"n1 NOT_USED by Test (FORM_IGNORES_BROKER_LOTS)",
			"",
			"Warnings:",
			'n2 by Test: COMPANY_LOOKUP_FAILED ERROR=offline "again" ISIN=US1',
			"",
		].join("\n"),
	);
});

test("a graph with no drops or warnings says so", () => {
	const graph = new ProvenanceGraph({ parent: null });
	graph.node({}, ProvenanceNodeKind.FILE, "trades.xml", {});

	expect(renderProvenance(graph)).toEqual(
		["n1 FILE trades.xml", "", "Dropped:", "(none)", "", "Warnings:", "(none)", ""].join("\n"),
	);
});
