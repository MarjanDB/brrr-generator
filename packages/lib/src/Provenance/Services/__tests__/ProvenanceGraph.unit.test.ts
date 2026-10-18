import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";

const stage = ProvenanceStage.Schema.parse("Test");

test("a recorded node has an id, its kind, its label and its fields", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const row = {};

	graph.node(row, ProvenanceNodeKind.ROW, "Trade 1001", { symbol: "ACME" });

	const node = graph.nodeOf(row);
	expect(node.id).toEqual("n1");
	expect(node.kind).toEqual(ProvenanceNodeKind.ROW);
	expect(node.label).toEqual("Trade 1001");
	expect(node.fields).toEqual({ symbol: "ACME" });
});

test("ids follow the order nodes are recorded in", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const first = {};
	const second = {};

	graph.node(first, ProvenanceNodeKind.ROW, "Trade 1001", {});
	graph.node(second, ProvenanceNodeKind.ROW, "Trade 1002", {});

	expect(graph.nodeOf(first).id).toEqual("n1");
	expect(graph.nodeOf(second).id).toEqual("n2");
});

test("recording the same object twice keeps its first node", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const row = {};

	graph.node(row, ProvenanceNodeKind.ROW, "Trade 1001", {});
	graph.node(row, ProvenanceNodeKind.RECORD, "Something else", {});

	expect(graph.nodes()).toHaveLength(1);
	expect(graph.nodeOf(row).label).toEqual("Trade 1001");
});

test("asking for the node of an object never recorded throws", () => {
	const graph = new ProvenanceGraph({ parent: null });

	expect(() => graph.nodeOf({})).toThrow("Provenance: subject was never recorded as a node");
});

test("derive records an edge from each source to the result", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const buy = {};
	const split = {};
	const buyAfterSplit = {};
	graph.node(buy, ProvenanceNodeKind.EVENT, "buy 10", {});
	graph.node(split, ProvenanceNodeKind.CORPORATE_ACTION, "split 1→4", {});
	graph.node(buyAfterSplit, ProvenanceNodeKind.EVENT, "buy 40", {});

	graph.derive([buy, split], buyAfterSplit, ProvenanceChange.SPLIT, stage, "1→4");

	const edges = graph.edges();
	expect(edges).toHaveLength(2);
	expect(edges[0].from).toBe(graph.nodeOf(buy));
	expect(edges[0].to).toBe(graph.nodeOf(buyAfterSplit));
	expect(edges[0].change).toEqual(ProvenanceChange.SPLIT);
	expect(edges[0].by).toEqual("Test");
	expect(edges[0].detail).toEqual("1→4");
	expect(edges[1].from).toBe(graph.nodeOf(split));
	expect(edges[1].to).toBe(graph.nodeOf(buyAfterSplit));
});

test("deriving from or to an object never recorded throws", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const recorded = {};
	graph.node(recorded, ProvenanceNodeKind.EVENT, "buy 10", {});

	expect(() => graph.derive([{}], recorded, ProvenanceChange.SPLIT, stage, null)).toThrow(
		"Provenance: subject was never recorded as a node",
	);
	expect(() => graph.derive([recorded], {}, ProvenanceChange.SPLIT, stage, null)).toThrow(
		"Provenance: subject was never recorded as a node",
	);
});

test("drop records the node, the reason, who dropped it and why", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const row = {};
	graph.node(row, ProvenanceNodeKind.ROW, "Trade 1003", {});

	graph.drop(row, DropReason.NOT_SUPPORTED, stage, "asset class FUT");

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node).toBe(graph.nodeOf(row));
	expect(drops[0].reason).toEqual(DropReason.NOT_SUPPORTED);
	expect(drops[0].by).toEqual("Test");
	expect(drops[0].detail).toEqual("asset class FUT");
});

test("warn records a warning on the node", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const line = {};
	graph.node(line, ProvenanceNodeKind.REPORT_LINE, "DIV line", {});

	graph.warn(line, stage, "company lookup failed");

	const warnings = graph.warnings();
	expect(warnings).toHaveLength(1);
	expect(warnings[0].node).toBe(graph.nodeOf(line));
	expect(warnings[0].by).toEqual("Test");
	expect(warnings[0].detail).toEqual("company lookup failed");
});

test("the null recorder accepts anything without recording", () => {
	const recorder = new NullProvenanceRecorder();
	const never = {};

	recorder.node(never, ProvenanceNodeKind.ROW, "Trade 1001", {});
	recorder.derive([{}], never, ProvenanceChange.PARSED, stage, null);
	recorder.drop({}, DropReason.NOT_SUPPORTED, stage, null);
	recorder.warn({}, stage, "nothing");

	expect(recorder).toBeInstanceOf(NullProvenanceRecorder);
});
