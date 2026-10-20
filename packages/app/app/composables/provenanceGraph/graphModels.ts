import {
	ProvenanceChange,
	type ProvenanceDrop,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceGraph,
	type ProvenanceNode,
	ProvenanceNodeKind,
	ProvenanceWalker,
	type ProvenanceWarning,
	type ReportLeftOut,
	type ReportMatchedLot,
	type ReportProvenance,
} from "@brrr/lib";
import {
	GraphDirection,
	GraphHeading,
	GraphLane,
	type GraphModel,
	type GraphModelEdge,
	type GraphNode,
	GraphNodeKey,
	GraphNodeKind,
	type GraphPair,
	GraphStage,
	type SplitFactor,
	SplitFactorKind,
} from "~/types/provenanceGraph";

const kindOf: Record<ProvenanceNodeKind, GraphNodeKind | null> = {
	[ProvenanceNodeKind.FILE]: GraphNodeKind.FILE,
	[ProvenanceNodeKind.ROW]: GraphNodeKind.ROW,
	[ProvenanceNodeKind.RECORD]: GraphNodeKind.RECORD,
	[ProvenanceNodeKind.STAGING_EVENT]: GraphNodeKind.STAGING_EVENT,
	[ProvenanceNodeKind.STAGING_LOT]: GraphNodeKind.STAGING_LOT,
	[ProvenanceNodeKind.STAGING_GROUPING]: null,
	[ProvenanceNodeKind.STAGING_CORPORATE_ACTION]: GraphNodeKind.STAGING_CORPORATE_ACTION,
	[ProvenanceNodeKind.EVENT]: GraphNodeKind.EVENT,
	[ProvenanceNodeKind.GROUPING]: null,
	[ProvenanceNodeKind.CORPORATE_ACTION]: GraphNodeKind.CORPORATE_ACTION,
	[ProvenanceNodeKind.LOT]: GraphNodeKind.LOT,
	[ProvenanceNodeKind.MATCHED_LOT]: GraphNodeKind.MATCHED_LOT,
	[ProvenanceNodeKind.LEG]: GraphNodeKind.LEG,
	[ProvenanceNodeKind.SUM]: GraphNodeKind.SUM,
	[ProvenanceNodeKind.REPORT_LINE]: GraphNodeKind.REPORT_LINE,
};

function graphNodeKindOf(kind: ProvenanceNodeKind): GraphNodeKind | null {
	return kindOf[kind];
}

// Steps the reader doesn't need to see unless asked: they fold into the edges around them.
function isHiddenStep(kind: GraphNodeKind): boolean {
	return (
		kind === GraphNodeKind.RECORD ||
		kind === GraphNodeKind.STAGING_EVENT ||
		kind === GraphNodeKind.STAGING_LOT ||
		kind === GraphNodeKind.STAGING_CORPORATE_ACTION ||
		kind === GraphNodeKind.LEG
	);
}

function stageOf(kind: GraphNodeKind): GraphStage {
	switch (kind) {
		case GraphNodeKind.FILE:
			return GraphStage.EXPORT;
		case GraphNodeKind.ROW:
			return GraphStage.ROW;
		case GraphNodeKind.RECORD:
			return GraphStage.RECORD;
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return GraphStage.STAGING;
		case GraphNodeKind.EVENT:
		case GraphNodeKind.LOT:
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphStage.CORE;
		case GraphNodeKind.MATCHED_LOT:
		case GraphNodeKind.SUM:
			return GraphStage.MATCHED;
		case GraphNodeKind.LEG:
			return GraphStage.LEG;
		case GraphNodeKind.REPORT_LINE:
		case GraphNodeKind.PAIR:
			return GraphStage.REPORT;
		case GraphNodeKind.DROP:
			return GraphStage.DROP;
		case GraphNodeKind.STACK:
			throw new Error("A stack has no stage of its own; ask for its members'");
	}
}

// The name of the column a node stands in. A node rebuilt from one of its own stage says so.
function headingOf(node: GraphNode, isRebuilt: boolean): GraphHeading {
	switch (node.kind) {
		case GraphNodeKind.FILE:
			return GraphHeading.EXPORT;
		case GraphNodeKind.ROW:
			return GraphHeading.ROW;
		case GraphNodeKind.RECORD:
			return GraphHeading.PARSED;
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return GraphHeading.STAGING;
		case GraphNodeKind.EVENT:
			return isRebuilt ? GraphHeading.AFTER_CORPORATE_ACTION : eventHeading(node);
		case GraphNodeKind.LOT:
			return GraphHeading.BROKER_LOT;
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphHeading.CORPORATE_ACTION;
		case GraphNodeKind.MATCHED_LOT:
			return GraphHeading.MATCHED;
		case GraphNodeKind.SUM:
			return isRebuilt ? GraphHeading.SUMMED_PER_DAY : GraphHeading.SUMMED_PER_ACTION;
		case GraphNodeKind.LEG:
			return GraphHeading.LEG;
		case GraphNodeKind.REPORT_LINE:
			return GraphHeading.REPORT;
		case GraphNodeKind.PAIR:
			return GraphHeading.REPORT_PAIRS;
		case GraphNodeKind.DROP:
			return GraphHeading.LEFT_OUT;
		case GraphNodeKind.STACK:
			throw new Error("A stack is named by its members");
	}
}

function eventHeading(node: GraphNode): GraphHeading {
	switch (node.source?.fields[ProvenanceField.EVENT_KIND]) {
		case ProvenanceEventKind.DIVIDEND:
		case ProvenanceEventKind.PAYMENT_IN_LIEU:
			return GraphHeading.DIVIDEND;
		case ProvenanceEventKind.WITHHOLDING_TAX:
		case ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU:
			return GraphHeading.TAX;
		default:
			return GraphHeading.TRADE;
	}
}

// The lane of a trade or dividend comes from what it is, never from a label or a sign.
function laneOfEvent(event: ProvenanceNode): GraphLane {
	switch (event.fields[ProvenanceField.EVENT_KIND]) {
		case ProvenanceEventKind.ACQUIRED:
		case ProvenanceEventKind.DIVIDEND:
		case ProvenanceEventKind.PAYMENT_IN_LIEU:
			return GraphLane.ACQUIRED;
		case ProvenanceEventKind.SOLD:
		case ProvenanceEventKind.WITHHOLDING_TAX:
		case ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU:
			return GraphLane.SOLD;
		default:
			return GraphLane.MIDDLE;
	}
}

// The lane of a recorded node (not of a pair, which is in the middle, nor of a left-out node, which
// follows its owner). A row or a hidden step takes the one lane of the trades, lots and corporate
// actions it became, and the middle when it became things from both.
function laneOfSource(source: ProvenanceNode, walker: ProvenanceWalker): GraphLane {
	const kind = graphNodeKindOf(source.kind);
	switch (kind) {
		case GraphNodeKind.EVENT:
			return laneOfEvent(source);
		case GraphNodeKind.LOT:
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphLane.ACQUIRED;
		case GraphNodeKind.ROW:
		case GraphNodeKind.RECORD:
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return laneOfWhatItBecame(source, walker);
		default:
			return GraphLane.MIDDLE;
	}
}

function laneOfWhatItBecame(source: ProvenanceNode, walker: ProvenanceWalker): GraphLane {
	const lanes = new Set<GraphLane>();
	const seen = new Set<ProvenanceNode>([source]);
	const pending: ProvenanceNode[] = [source];
	for (const current of pending) {
		for (const edge of walker.children(current)) {
			const next = edge.to;
			if (seen.has(next)) {
				continue;
			}
			seen.add(next);
			const nextKind = graphNodeKindOf(next.kind);
			if (
				nextKind === GraphNodeKind.EVENT ||
				nextKind === GraphNodeKind.LOT ||
				nextKind === GraphNodeKind.CORPORATE_ACTION
			) {
				lanes.add(laneOfSource(next, walker));
			} else if (nextKind !== null && isHiddenStep(nextKind)) {
				pending.push(next);
			}
		}
	}
	const [only] = [...lanes];
	return lanes.size === 1 && only !== undefined ? only : GraphLane.MIDDLE;
}

// What a split did to a quantity, or null when either is not a positive number.
function splitFactorOf(before: string, after: string): SplitFactor | null {
	const quantityBefore = Number(before);
	const quantityAfter = Number(after);
	if (!(quantityBefore > 0) || !(quantityAfter > 0)) {
		return null;
	}
	if (quantityAfter >= quantityBefore) {
		return { kind: SplitFactorKind.MULTIPLY, amount: quantityAfter / quantityBefore };
	}
	return { kind: SplitFactorKind.DIVIDE, amount: quantityBefore / quantityAfter };
}

function modelIns(model: GraphModel, node: GraphNode): GraphModelEdge[] {
	return model.incoming.get(node) ?? [];
}

function modelOuts(model: GraphModel, node: GraphNode): GraphModelEdge[] {
	return model.outgoing.get(node) ?? [];
}

// The node a recorded node is drawn as: itself when visible, its pair when it is a matched lot,
// leg or report line of one, and for a hidden step the first visible node after it (else before).
function modelNodeFor(model: GraphModel, source: ProvenanceNode): GraphNode {
	const node = model.nodeBySource.get(source);
	if (node === undefined) {
		throw new Error(`The graph has no visible node for ${source.id}`);
	}
	return node;
}

function modelLaneOf(model: GraphModel, node: GraphNode): GraphLane {
	const lane = model.lanes.get(node);
	if (lane === undefined) {
		throw new Error(`The graph has no lane for ${node.key}`);
	}
	return lane;
}

// In the next column of its stage: a trade after a split, a sum merged per day.
function modelIsRebuilt(model: GraphModel, node: GraphNode): boolean {
	return model.rebuilt.has(node);
}

// A change that makes its target a new version of something of its own stage.
const rebuildingChanges: ProvenanceChange[] = [
	ProvenanceChange.SPLIT,
	ProvenanceChange.RENAMED,
	ProvenanceChange.MERGED,
];

// Everything building one model reads about a report.
type BuildContext = {
	walker: ProvenanceWalker;
	sources: ProvenanceNode[];
	pairs: GraphPair[];
	warningsByNode: Map<ProvenanceNode, ProvenanceWarning[]>;
};

// The visible graph for one mode: the graph's recorded nodes, the matched lots with their lines as
// pair cards, the hidden steps folded into edges, the drops as nodes of their own. The graph's
// instruments (GROUPING) are context and never part of any model.
function graphModelOf(
	graph: ProvenanceGraph,
	reading: ReportProvenance,
	showEveryStep: boolean,
): GraphModel {
	const warningsByNode = new Map<ProvenanceNode, ProvenanceWarning[]>();
	for (const warning of graph.warnings()) {
		warningsByNode.set(warning.node, [...(warningsByNode.get(warning.node) ?? []), warning]);
	}
	const context: BuildContext = {
		walker: new ProvenanceWalker(graph),
		sources: graph.nodes(),
		pairs: pairsOf(reading),
		warningsByNode,
	};
	return buildModel(context, showEveryStep);
}

function pairsOf(reading: ReportProvenance): GraphPair[] {
	const instruments = [
		...reading.stocks,
		...reading.optionUnderlyings.flatMap((underlying) => underlying.contracts),
		...reading.dividendPayers,
		...reading.withoutLines,
	];
	const lots = new Map<ProvenanceNode, ReportMatchedLot>();
	for (const lot of instruments.flatMap((instrument) => instrument.matchedLots)) {
		lots.set(lot.node, lot);
	}
	return [...lots.values()].map((lot) => ({
		key: GraphNodeKey.Schema.parse(`pair:${lot.node.id}`),
		lot: lot.node,
		acquired: { leg: lot.acquired.leg, line: lot.acquired.line },
		sold: { leg: lot.sold.leg, line: lot.sold.line },
		leftOut: distinctLeftOut([...lot.acquired.leftOut, ...lot.sold.leftOut]),
	}));
}

function distinctLeftOut(leftOut: ReportLeftOut[]): ReportLeftOut[] {
	const byKey = new Map<string, ReportLeftOut>();
	for (const item of leftOut) {
		const key = dropKey(item.drop);
		if (!byKey.has(key)) {
			byKey.set(key, item);
		}
	}
	return [...byKey.values()];
}

// A drop's reason and detail, not where it sits: two legs dropped the same way are one.
function dropKey(drop: ProvenanceDrop): string {
	const values = Object.entries(drop.detail?.values ?? {})
		.map(([name, value]) => `${name}=${value}`)
		.sort();
	return `${drop.reason}:${drop.detail?.kind ?? "-"}:${values.join(",")}`;
}

function buildModel(context: BuildContext, showEveryStep: boolean): GraphModel {
	const pairs = showEveryStep ? [] : context.pairs;
	const pairOf = new Map<ProvenanceNode, GraphPair>();
	for (const pair of pairs) {
		for (const member of [
			pair.lot,
			pair.acquired.leg,
			pair.sold.leg,
			pair.acquired.line,
			pair.sold.line,
		]) {
			if (member !== null) {
				pairOf.set(member, pair);
			}
		}
	}

	// The node each recorded node is drawn as, when it is drawn: itself, or its pair.
	const drawnAs = new Map<ProvenanceNode, GraphNode>();
	const pairNodes = new Map<GraphPair, GraphNode>();
	const nodes: GraphNode[] = [];
	for (const source of context.sources) {
		const pair = pairOf.get(source);
		if (pair !== undefined) {
			let pairNode = pairNodes.get(pair);
			if (pairNode === undefined) {
				pairNode = {
					key: pair.key,
					kind: GraphNodeKind.PAIR,
					source: pair.lot,
					pair,
					drop: null,
					stack: null,
					warnings: [pair.lot, pair.acquired.leg, pair.sold.leg, pair.acquired.line, pair.sold.line]
						.filter((member): member is ProvenanceNode => member !== null)
						.flatMap((member) => context.warningsByNode.get(member) ?? []),
				};
				pairNodes.set(pair, pairNode);
				nodes.push(pairNode);
			}
			drawnAs.set(source, pairNode);
			continue;
		}
		const kind = graphNodeKindOf(source.kind);
		if (kind === null || (!showEveryStep && isHiddenStep(kind))) {
			continue;
		}
		const node: GraphNode = {
			key: GraphNodeKey.Schema.parse(source.id),
			kind,
			source,
			pair: null,
			drop: null,
			stack: null,
			warnings: context.warningsByNode.get(source) ?? [],
		};
		drawnAs.set(source, node);
		nodes.push(node);
	}

	const edges = foldedEdges(context, drawnAs);

	const nodeBySource = new Map<ProvenanceNode, GraphNode>();
	for (const source of context.sources) {
		const node =
			drawnAs.get(source) ??
			(graphNodeKindOf(source.kind) === null
				? undefined
				: (nearest(context, source, drawnAs, GraphDirection.DOWN) ??
					nearest(context, source, drawnAs, GraphDirection.UP)));
		if (node !== undefined) {
			nodeBySource.set(source, node);
		}
	}

	const rebuilt = new Set<GraphNode>();
	for (const node of nodes) {
		if (node.source !== null && node.kind !== GraphNodeKind.PAIR && isRebuilt(context, node)) {
			rebuilt.add(node);
		}
	}

	const lanes = new Map<GraphNode, GraphLane>();
	for (const node of nodes) {
		lanes.set(
			node,
			node.source === null || node.kind === GraphNodeKind.PAIR
				? GraphLane.MIDDLE
				: laneOfSource(node.source, context.walker),
		);
	}

	const drops = dropNodes(context, drawnAs);
	for (const { node, owner } of drops) {
		nodes.push(node);
		edges.push({ from: owner, to: node, change: null, split: null });
		lanes.set(node, lanes.get(owner) ?? GraphLane.MIDDLE);
	}

	const incoming = new Map<GraphNode, GraphModelEdge[]>();
	const outgoing = new Map<GraphNode, GraphModelEdge[]>();
	for (const edge of edges) {
		append(incoming, edge.to, edge);
		append(outgoing, edge.from, edge);
	}

	return { nodes, edges, pairs, nodeBySource, lanes, rebuilt, incoming, outgoing };
}

function append(
	edges: Map<GraphNode, GraphModelEdge[]>,
	node: GraphNode,
	edge: GraphModelEdge,
): void {
	const existing = edges.get(node);
	if (existing === undefined) {
		edges.set(node, [edge]);
	} else {
		existing.push(edge);
	}
}

// One edge from each drawn node to each drawn node it reaches through hidden steps, keeping the
// change of the first recorded edge. Instruments are context: no edge goes through one.
function foldedEdges(
	context: BuildContext,
	drawnAs: Map<ProvenanceNode, GraphNode>,
): GraphModelEdge[] {
	const edges: GraphModelEdge[] = [];
	const seen = new Set<string>();
	for (const start of context.sources) {
		const from = drawnAs.get(start);
		if (from === undefined) {
			continue;
		}
		const pending = context.walker.children(start).map((edge) => ({ edge, first: edge }));
		const passed = new Set<ProvenanceNode>();
		for (const { edge, first } of pending) {
			const to = drawnAs.get(edge.to);
			if (to !== undefined) {
				const key = `${from.key}>${to.key}`;
				if (to !== from && !seen.has(key)) {
					seen.add(key);
					edges.push({
						from,
						to,
						change: first.change,
						split: splitOf(context, from, to, first.change),
					});
				}
			} else if (graphNodeKindOf(edge.to.kind) !== null && !passed.has(edge.to)) {
				passed.add(edge.to);
				for (const next of context.walker.children(edge.to)) {
					pending.push({ edge: next, first });
				}
			}
		}
	}
	return edges;
}

// The factor of a split, on the edge from a trade (or broker lot) to the one rebuilt from it.
function splitOf(
	context: BuildContext,
	from: GraphNode,
	to: GraphNode,
	firstChange: ProvenanceChange,
): SplitFactor | null {
	if (
		firstChange !== ProvenanceChange.SPLIT ||
		from.kind !== to.kind ||
		(from.kind !== GraphNodeKind.EVENT && from.kind !== GraphNodeKind.LOT) ||
		to.source === null
	) {
		return null;
	}
	const action = context.walker
		.parents(to.source)
		.find(
			(edge) =>
				edge.change === ProvenanceChange.SPLIT &&
				graphNodeKindOf(edge.from.kind) === GraphNodeKind.CORPORATE_ACTION,
		);
	if (action === undefined) {
		return null;
	}
	return splitFactorOf(
		action.from.fields[ProvenanceField.SPLIT_BEFORE] ?? "",
		action.from.fields[ProvenanceField.SPLIT_AFTER] ?? "",
	);
}

function isRebuilt(context: BuildContext, node: GraphNode): boolean {
	if (node.source === null) {
		return false;
	}
	const stage = stageOf(node.kind);
	return context.walker.parents(node.source).some((edge) => {
		const parentKind = graphNodeKindOf(edge.from.kind);
		return (
			parentKind !== null &&
			rebuildingChanges.includes(edge.change) &&
			stageOf(parentKind) === stage
		);
	});
}

// A drop is not a node in lib. Each distinct reason and detail on one owner becomes one node.
function dropNodes(
	context: BuildContext,
	drawnAs: Map<ProvenanceNode, GraphNode>,
): { node: GraphNode; owner: GraphNode }[] {
	const groups = new Map<string, { node: GraphNode; owner: GraphNode }>();
	for (const drop of context.walker.drops()) {
		const owner =
			drawnAs.get(drop.node) ??
			nearest(context, drop.node, drawnAs, GraphDirection.UP) ??
			nearest(context, drop.node, drawnAs, GraphDirection.DOWN);
		if (owner === undefined) {
			continue;
		}
		const key = `drop:${owner.key}:${dropKey(drop)}`;
		if (!groups.has(key)) {
			groups.set(key, {
				owner,
				node: {
					key: GraphNodeKey.Schema.parse(key),
					kind: GraphNodeKind.DROP,
					source: drop.node,
					pair: null,
					drop,
					stack: null,
					warnings: [],
				},
			});
		}
	}
	return [...groups.values()];
}

// The closest node that is drawn, found breadth first through steps that are not. Instruments
// are never walked through.
function nearest(
	context: BuildContext,
	start: ProvenanceNode,
	drawnAs: Map<ProvenanceNode, GraphNode>,
	direction: GraphDirection,
): GraphNode | undefined {
	const seen = new Set<ProvenanceNode>([start]);
	const pending: ProvenanceNode[] = [start];
	for (const current of pending) {
		const edges =
			direction === GraphDirection.UP
				? context.walker.parents(current)
				: context.walker.children(current);
		for (const edge of edges) {
			const next = direction === GraphDirection.UP ? edge.from : edge.to;
			if (seen.has(next)) {
				continue;
			}
			seen.add(next);
			const drawn = drawnAs.get(next);
			if (drawn !== undefined) {
				return drawn;
			}
			if (graphNodeKindOf(next.kind) !== null) {
				pending.push(next);
			}
		}
	}
	return undefined;
}

// What a report's provenance graph is drawn from: the nodes and edges it shows, and lookups on them.
export const GraphModels = {
	of: graphModelOf,
	nodeFor: modelNodeFor,
	ins: modelIns,
	outs: modelOuts,
	laneOf: modelLaneOf,
	isRebuilt: modelIsRebuilt,
	nodeKindOf: graphNodeKindOf,
	isHiddenStep,
	stageOf,
	headingOf,
	splitFactorOf,
};
