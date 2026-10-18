import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";

const stage = ProvenanceStage.Schema.parse("Test");

const graph = new ProvenanceGraph({ parent: null });
const file = {};
const rowBuy = {};
const rowSell = {};
const rowSplitOld = {};
const rowSplitNew = {};
const rowFuture = {};
const buy = {};
const sell = {};
const split = {};
const buyAfterSplit = {};
const lot = {};
const legBuy = {};
const legSell = {};
const lineBought = {};
const lineSold = {};
graph.node(file, ProvenanceNodeKind.FILE, "trades.xml", {});
graph.node(rowBuy, ProvenanceNodeKind.ROW, "Trade 1001", {});
graph.node(rowSell, ProvenanceNodeKind.ROW, "Trade 1002", {});
graph.node(rowSplitOld, ProvenanceNodeKind.ROW, "Corporate action ACME.OLD", {});
graph.node(rowSplitNew, ProvenanceNodeKind.ROW, "Corporate action ACME", {});
graph.node(rowFuture, ProvenanceNodeKind.ROW, "Trade 1003", {});
graph.derive([file], rowBuy, ProvenanceChange.CONTAINS, stage, null);
graph.derive([file], rowSell, ProvenanceChange.CONTAINS, stage, null);
graph.derive([file], rowSplitOld, ProvenanceChange.CONTAINS, stage, null);
graph.derive([file], rowSplitNew, ProvenanceChange.CONTAINS, stage, null);
graph.derive([file], rowFuture, ProvenanceChange.CONTAINS, stage, null);
graph.drop(
	rowFuture,
	DropReason.NOT_SUPPORTED,
	stage,
	new ProvenanceDetail({
		kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
		values: { [ProvenanceDetailValue.ASSET_CLASS]: "FUT" },
	}),
);
graph.node(buy, ProvenanceNodeKind.EVENT, "buy 10", {});
graph.node(sell, ProvenanceNodeKind.EVENT, "sell 40", {});
graph.derive([rowBuy], buy, ProvenanceChange.TRANSFORMED, stage, null);
graph.derive([rowSell], sell, ProvenanceChange.TRANSFORMED, stage, null);
graph.node(split, ProvenanceNodeKind.CORPORATE_ACTION, "split 1→4", {});
graph.derive([rowSplitOld, rowSplitNew], split, ProvenanceChange.PAIRED, stage, null);
graph.node(buyAfterSplit, ProvenanceNodeKind.EVENT, "buy 40", {});
graph.derive([buy, split], buyAfterSplit, ProvenanceChange.SPLIT, stage, "1→4");
graph.node(lot, ProvenanceNodeKind.LOT, "lot 40", {});
graph.derive([buyAfterSplit, sell], lot, ProvenanceChange.MATCHED, stage, null);
graph.node(legBuy, ProvenanceNodeKind.LEG, "leg buy 40", {});
graph.node(legSell, ProvenanceNodeKind.LEG, "leg sell 40", {});
graph.derive([lot], legBuy, ProvenanceChange.MATCHED, stage, null);
graph.derive([lot], legSell, ProvenanceChange.MATCHED, stage, null);
graph.node(lineBought, ProvenanceNodeKind.REPORT_LINE, "KDVP line bought 40", {});
graph.node(lineSold, ProvenanceNodeKind.REPORT_LINE, "KDVP line sold 40", {});
graph.derive([legBuy], lineBought, ProvenanceChange.REPORTED, stage, null);
graph.derive([legSell], lineSold, ProvenanceChange.REPORTED, stage, null);

test("walking up from a line reaches every row behind it, each once", () => {
	const walker = new ProvenanceWalker(graph);

	const slice = walker.up(graph.nodeOf(lineSold));

	expect(slice.nodes.map((node) => node.label)).toEqual([
		"KDVP line sold 40",
		"leg sell 40",
		"lot 40",
		"buy 40",
		"sell 40",
		"buy 10",
		"split 1→4",
		"Trade 1002",
		"Trade 1001",
		"Corporate action ACME.OLD",
		"Corporate action ACME",
		"trades.xml",
	]);
	expect(slice.edges).toHaveLength(14);
	expect(slice.drops).toEqual([]);
});

test("walking down from a row reaches every line it fed", () => {
	const walker = new ProvenanceWalker(graph);

	const slice = walker.down(graph.nodeOf(rowBuy));

	expect(slice.nodes.map((node) => node.label)).toEqual([
		"Trade 1001",
		"buy 10",
		"buy 40",
		"lot 40",
		"leg buy 40",
		"leg sell 40",
		"KDVP line bought 40",
		"KDVP line sold 40",
	]);
	expect(slice.edges).toHaveLength(7);
});

test("walking down from a dropped row ends at its drop", () => {
	const walker = new ProvenanceWalker(graph);

	const slice = walker.down(graph.nodeOf(rowFuture));

	expect(slice.nodes.map((node) => node.label)).toEqual(["Trade 1003"]);
	expect(slice.edges).toEqual([]);
	expect(slice.drops).toHaveLength(1);
	expect(slice.drops[0].reason).toEqual(DropReason.NOT_SUPPORTED);
	expect(slice.drops[0].detail?.kind).toEqual(ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED);
	expect(slice.drops[0].detail?.values[ProvenanceDetailValue.ASSET_CLASS]).toEqual("FUT");
});

test("parents and children are one step", () => {
	const walker = new ProvenanceWalker(graph);

	const parents = walker.parents(graph.nodeOf(buyAfterSplit));
	const children = walker.children(graph.nodeOf(lot));

	expect(parents).toHaveLength(2);
	expect(parents[0].from.label).toEqual("buy 10");
	expect(parents[0].change).toEqual(ProvenanceChange.SPLIT);
	expect(parents[1].from.label).toEqual("split 1→4");
	expect(children).toHaveLength(2);
	expect(children[0].to.label).toEqual("leg buy 40");
	expect(children[1].to.label).toEqual("leg sell 40");
});

test("inputs are the files", () => {
	const walker = new ProvenanceWalker(graph);

	const inputs = walker.inputs();

	expect(inputs).toHaveLength(1);
	expect(inputs[0].label).toEqual("trades.xml");
});

test("changing a list the walker hands out doesn't change the walker", () => {
	const walker = new ProvenanceWalker(graph);

	walker.parents(graph.nodeOf(buyAfterSplit)).pop();
	walker.children(graph.nodeOf(lot)).pop();
	walker.drops().pop();

	expect(walker.parents(graph.nodeOf(buyAfterSplit))).toHaveLength(2);
	expect(walker.children(graph.nodeOf(lot))).toHaveLength(2);
	expect(walker.drops()).toHaveLength(1);
});

test("drops lists every drop", () => {
	const walker = new ProvenanceWalker(graph);

	const drops = walker.drops();

	expect(drops).toHaveLength(1);
	expect(drops[0].node.label).toEqual("Trade 1003");
});

test("a walker over a layer walks into its parent", () => {
	const parent = new ProvenanceGraph({ parent: null });
	const row = {};
	parent.node(row, ProvenanceNodeKind.ROW, "Trade 1001", {});
	const layer = parent.layer();
	const line = {};
	layer.node(line, ProvenanceNodeKind.REPORT_LINE, "KDVP line", {});
	layer.derive([row], line, ProvenanceChange.REPORTED, stage, null);

	const slice = new ProvenanceWalker(layer).up(layer.nodeOf(line));

	expect(slice.nodes.map((node) => node.label)).toEqual(["KDVP line", "Trade 1001"]);
});

test("a walk stops when the graph has a cycle", () => {
	const cyclic = new ProvenanceGraph({ parent: null });
	const a = {};
	const b = {};
	cyclic.node(a, ProvenanceNodeKind.EVENT, "a", {});
	cyclic.node(b, ProvenanceNodeKind.EVENT, "b", {});
	cyclic.derive([a], b, ProvenanceChange.CONVERTED, stage, null);
	cyclic.derive([b], a, ProvenanceChange.CONVERTED, stage, null);

	const slice = new ProvenanceWalker(cyclic).down(cyclic.nodeOf(a));

	expect(slice.nodes.map((node) => node.label)).toEqual(["a", "b"]);
	expect(slice.edges).toHaveLength(2);
});

test("a node from another graph is refused", () => {
	const other = new ProvenanceGraph({ parent: null });
	const stranger = {};
	other.node(stranger, ProvenanceNodeKind.ROW, "Trade 9999", {});
	const walker = new ProvenanceWalker(graph);

	expect(() => walker.up(other.nodeOf(stranger))).toThrow("Provenance: node is not in this graph");
});

test("a walker told to ignore a change does not follow edges of that change", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const eventA = {};
	const eventB = {};
	const grouping = {};
	const line = {};
	graph.node(eventA, ProvenanceNodeKind.EVENT, "buy A", {});
	graph.node(eventB, ProvenanceNodeKind.EVENT, "buy B", {});
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping", {});
	graph.node(line, ProvenanceNodeKind.REPORT_LINE, "line", {});
	graph.derive([eventA, eventB], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([grouping], line, ProvenanceChange.REPORTED, stage, null);

	const walker = new ProvenanceWalker(graph, [ProvenanceChange.GROUPED]);

	expect(walker.parents(graph.nodeOf(grouping))).toHaveLength(0);
	expect(walker.children(graph.nodeOf(eventA))).toHaveLength(0);
	expect(walker.up(graph.nodeOf(line)).nodes).toEqual([graph.nodeOf(line), graph.nodeOf(grouping)]);
	expect(walker.down(graph.nodeOf(eventA)).nodes).toEqual([graph.nodeOf(eventA)]);
});

test("a walker told to ignore nothing follows every edge", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const eventA = {};
	const grouping = {};
	const line = {};
	graph.node(eventA, ProvenanceNodeKind.EVENT, "buy A", {});
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping", {});
	graph.node(line, ProvenanceNodeKind.REPORT_LINE, "line", {});
	graph.derive([eventA], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([grouping], line, ProvenanceChange.REPORTED, stage, null);

	const walker = new ProvenanceWalker(graph);

	expect(walker.up(graph.nodeOf(line)).nodes).toHaveLength(3);
	expect(walker.down(graph.nodeOf(eventA)).nodes).toHaveLength(3);
});

test("the drops of a node are the ones recorded on it", () => {
	const walker = new ProvenanceWalker(graph);

	const drops = walker.dropsOf(graph.nodeOf(rowFuture));

	expect(drops).toHaveLength(1);
	expect(drops[0].reason).toEqual(DropReason.NOT_SUPPORTED);
	expect(walker.dropsOf(graph.nodeOf(rowBuy))).toHaveLength(0);
});
