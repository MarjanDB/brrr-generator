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

test("a layer sees its parent's nodes and edges", () => {
	const parent = new ProvenanceGraph({ parent: null });
	const row = {};
	const record = {};
	parent.node(row, ProvenanceNodeKind.ROW, "Trade 1001", {});
	parent.node(record, ProvenanceNodeKind.RECORD, "Trade 1001", {});
	parent.derive([row], record, ProvenanceChange.PARSED, stage, null);

	const layer = parent.layer();

	expect(layer.nodes()).toHaveLength(2);
	expect(layer.edges()).toHaveLength(1);
	expect(layer.nodeOf(row)).toBe(parent.nodeOf(row));
});

test("what a layer records stays out of its parent", () => {
	const parent = new ProvenanceGraph({ parent: null });
	const record = {};
	parent.node(record, ProvenanceNodeKind.RECORD, "Trade 1001", {});
	const layer = parent.layer();
	const event = {};

	layer.node(event, ProvenanceNodeKind.EVENT, "buy 10", {});
	layer.derive([record], event, ProvenanceChange.TRANSFORMED, stage, null);
	layer.drop(event, DropReason.OUTSIDE_PERIOD, stage, null);

	expect(parent.nodes()).toHaveLength(1);
	expect(parent.edges()).toHaveLength(0);
	expect(parent.drops()).toHaveLength(0);
	expect(layer.nodes()).toHaveLength(2);
	expect(layer.edges()).toHaveLength(1);
	expect(layer.drops()).toHaveLength(1);
});

test("recording a parent's object in a layer keeps the parent's node", () => {
	const parent = new ProvenanceGraph({ parent: null });
	const row = {};
	parent.node(row, ProvenanceNodeKind.ROW, "Trade 1001", {});
	const layer = parent.layer();

	layer.node(row, ProvenanceNodeKind.ROW, "Trade 1001", {});

	expect(layer.nodes()).toHaveLength(1);
	expect(layer.nodeOf(row)).toBe(parent.nodeOf(row));
});

test("a layer numbers its nodes after its parent's, and so does its sibling", () => {
	const parent = new ProvenanceGraph({ parent: null });
	parent.node({}, ProvenanceNodeKind.ROW, "Trade 1001", {});
	parent.node({}, ProvenanceNodeKind.ROW, "Trade 1002", {});
	const kdvp = parent.layer();
	const div = parent.layer();
	const kdvpLine = {};
	const divLine = {};

	kdvp.node(kdvpLine, ProvenanceNodeKind.REPORT_LINE, "KDVP line", {});
	div.node(divLine, ProvenanceNodeKind.REPORT_LINE, "DIV line", {});

	expect(kdvp.nodeOf(kdvpLine).id).toEqual("n3");
	expect(div.nodeOf(divLine).id).toEqual("n3");
});

test("a graph with layers can't record any more", () => {
	const parent = new ProvenanceGraph({ parent: null });
	parent.layer();

	expect(() => parent.node({}, ProvenanceNodeKind.ROW, "Trade 1001", {})).toThrow(
		"Provenance: this graph has layers; record into a layer instead",
	);
});
