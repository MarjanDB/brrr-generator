import { renderProvenance } from "@brrr/__tests__/support/ProvenanceSnapshot";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
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
	graph.drop(dropped, DropReason.NOT_SUPPORTED, stage, "asset class FUT");
	graph.warn(kept, stage, "looked odd");

	expect(renderProvenance(graph)).toEqual(
		[
			"n1 FILE trades.xml",
			"n2 ROW Trade 1001 · ACME",
			"  ← n1 CONTAINS by Test",
			"n3 ROW Trade 1003 · ES",
			"  ← n1 CONTAINS by Test (first statement)",
			"",
			"Dropped:",
			"n3 NOT_SUPPORTED by Test (asset class FUT)",
			"",
			"Warnings:",
			"n2 by Test: looked odd",
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
