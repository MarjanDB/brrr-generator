import {
	ProvenanceChange,
	type ProvenanceDrop,
	ProvenanceField,
	type ProvenanceGraph,
	type ProvenanceNode,
	ProvenanceWalker,
	type ProvenanceWarning,
	type ReportLeftOut,
	type ReportMatchedLot,
	type ReportProvenance,
} from "@brrr/lib";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphNodeKey } from "~/download/graph/GraphIdentifiers";
import { GraphLane } from "~/download/graph/GraphLane";
import { GraphModel } from "~/download/graph/GraphModel";
import { GraphModelEdge } from "~/download/graph/GraphModelEdge";
import { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind, graphNodeKindOf, isHiddenStep } from "~/download/graph/GraphNodeKind";
import { GraphPair } from "~/download/graph/GraphPair";
import { GraphPairSide } from "~/download/graph/GraphPairSide";
import { stageOf } from "~/download/graph/GraphStage";
import { laneOfSource } from "~/download/graph/laneOf";
import { SplitFactor } from "~/download/graph/SplitFactor";

// A change that makes its target a new version of something of its own stage.
const rebuildingChanges: ProvenanceChange[] = [
	ProvenanceChange.SPLIT,
	ProvenanceChange.RENAMED,
	ProvenanceChange.MERGED,
];

// Everything the layout reads about a report, prepared once: the graph's adjacency, the matched lots
// with their lines, the warnings by node. Builds the visible model for each mode on first ask.
// The graph's instruments (GROUPING) are context and never part of any model.
export class GraphIndex {
	private readonly walker: ProvenanceWalker;
	private readonly sources: ProvenanceNode[];
	private readonly pairs: GraphPair[];
	private readonly warningsByNode = new Map<ProvenanceNode, ProvenanceWarning[]>();
	private readonly models = new Map<boolean, GraphModel>();

	public constructor(graph: ProvenanceGraph, reading: ReportProvenance) {
		this.walker = new ProvenanceWalker(graph);
		this.sources = graph.nodes();
		this.pairs = this.pairsOf(reading);
		for (const warning of graph.warnings()) {
			this.warningsByNode.set(warning.node, [
				...(this.warningsByNode.get(warning.node) ?? []),
				warning,
			]);
		}
	}

	public model(showEveryStep: boolean): GraphModel {
		const existing = this.models.get(showEveryStep);
		if (existing !== undefined) {
			return existing;
		}
		const built = this.build(showEveryStep);
		this.models.set(showEveryStep, built);
		return built;
	}

	private pairsOf(reading: ReportProvenance): GraphPair[] {
		const instruments = [
			...reading.shares,
			...reading.optionUnderlyings.flatMap((underlying) => underlying.contracts),
			...reading.dividendPayers,
			...reading.withoutLines,
		];
		const lots = new Map<ProvenanceNode, ReportMatchedLot>();
		for (const lot of instruments.flatMap((instrument) => instrument.matchedLots)) {
			lots.set(lot.node, lot);
		}
		return [...lots.values()].map(
			(lot) =>
				new GraphPair({
					key: GraphNodeKey.Schema.parse(`pair:${lot.node.id}`),
					lot: lot.node,
					acquired: new GraphPairSide({ leg: lot.acquired.leg, line: lot.acquired.line }),
					sold: new GraphPairSide({ leg: lot.sold.leg, line: lot.sold.line }),
					leftOut: this.distinctLeftOut([...lot.acquired.leftOut, ...lot.sold.leftOut]),
				}),
		);
	}

	private distinctLeftOut(leftOut: ReportLeftOut[]): ReportLeftOut[] {
		const byKey = new Map<string, ReportLeftOut>();
		for (const item of leftOut) {
			const key = this.dropKey(item.drop);
			if (!byKey.has(key)) {
				byKey.set(key, item);
			}
		}
		return [...byKey.values()];
	}

	// A drop's reason and detail, not where it sits: two legs dropped the same way are one.
	private dropKey(drop: ProvenanceDrop): string {
		const values = Object.entries(drop.detail?.values ?? {})
			.map(([name, value]) => `${name}=${value}`)
			.sort();
		return `${drop.reason}:${drop.detail?.kind ?? "-"}:${values.join(",")}`;
	}

	private build(showEveryStep: boolean): GraphModel {
		const pairs = showEveryStep ? [] : this.pairs;
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
		for (const source of this.sources) {
			const pair = pairOf.get(source);
			if (pair !== undefined) {
				let pairNode = pairNodes.get(pair);
				if (pairNode === undefined) {
					pairNode = new GraphNode({
						key: pair.key,
						kind: GraphNodeKind.PAIR,
						source: pair.lot,
						pair,
						drop: null,
						stack: null,
						warnings: [
							pair.lot,
							pair.acquired.leg,
							pair.sold.leg,
							pair.acquired.line,
							pair.sold.line,
						]
							.filter((member): member is ProvenanceNode => member !== null)
							.flatMap((member) => this.warningsByNode.get(member) ?? []),
					});
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
			const node = new GraphNode({
				key: GraphNodeKey.Schema.parse(source.id),
				kind,
				source,
				pair: null,
				drop: null,
				stack: null,
				warnings: this.warningsByNode.get(source) ?? [],
			});
			drawnAs.set(source, node);
			nodes.push(node);
		}

		const edges = this.foldedEdges(drawnAs);

		const nodeBySource = new Map<ProvenanceNode, GraphNode>();
		for (const source of this.sources) {
			const node =
				drawnAs.get(source) ??
				(graphNodeKindOf(source.kind) === null
					? undefined
					: (this.nearest(source, drawnAs, GraphDirection.DOWN) ??
						this.nearest(source, drawnAs, GraphDirection.UP)));
			if (node !== undefined) {
				nodeBySource.set(source, node);
			}
		}

		const rebuilt = new Set<GraphNode>();
		for (const node of nodes) {
			if (node.source !== null && node.kind !== GraphNodeKind.PAIR && this.isRebuilt(node)) {
				rebuilt.add(node);
			}
		}

		const lanes = new Map<GraphNode, GraphLane>();
		for (const node of nodes) {
			lanes.set(
				node,
				node.source === null || node.kind === GraphNodeKind.PAIR
					? GraphLane.MIDDLE
					: laneOfSource(node.source, this.walker),
			);
		}

		const drops = this.dropNodes(drawnAs);
		for (const { node, owner } of drops) {
			nodes.push(node);
			edges.push(new GraphModelEdge({ from: owner, to: node, change: null, split: null }));
			lanes.set(node, lanes.get(owner) ?? GraphLane.MIDDLE);
		}

		return new GraphModel({ nodes, edges, pairs, nodeBySource, lanes, rebuilt });
	}

	// One edge from each drawn node to each drawn node it reaches through hidden steps, keeping the
	// change of the first recorded edge. Instruments are context: no edge goes through one.
	private foldedEdges(drawnAs: Map<ProvenanceNode, GraphNode>): GraphModelEdge[] {
		const edges: GraphModelEdge[] = [];
		const seen = new Set<string>();
		for (const start of this.sources) {
			const from = drawnAs.get(start);
			if (from === undefined) {
				continue;
			}
			const pending = this.walker.children(start).map((edge) => ({ edge, first: edge }));
			const passed = new Set<ProvenanceNode>();
			for (const { edge, first } of pending) {
				const to = drawnAs.get(edge.to);
				if (to !== undefined) {
					const key = `${from.key}>${to.key}`;
					if (to !== from && !seen.has(key)) {
						seen.add(key);
						edges.push(
							new GraphModelEdge({
								from,
								to,
								change: first.change,
								split: this.splitOf(from, to, first.change),
							}),
						);
					}
				} else if (graphNodeKindOf(edge.to.kind) !== null && !passed.has(edge.to)) {
					passed.add(edge.to);
					for (const next of this.walker.children(edge.to)) {
						pending.push({ edge: next, first });
					}
				}
			}
		}
		return edges;
	}

	// The factor of a split, on the edge from a trade (or broker lot) to the one rebuilt from it.
	private splitOf(
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
		const action = this.walker
			.parents(to.source)
			.find(
				(edge) =>
					edge.change === ProvenanceChange.SPLIT &&
					graphNodeKindOf(edge.from.kind) === GraphNodeKind.CORPORATE_ACTION,
			);
		if (action === undefined) {
			return null;
		}
		return SplitFactor.of(
			action.from.fields[ProvenanceField.SPLIT_BEFORE] ?? "",
			action.from.fields[ProvenanceField.SPLIT_AFTER] ?? "",
		);
	}

	private isRebuilt(node: GraphNode): boolean {
		if (node.source === null) {
			return false;
		}
		const stage = stageOf(node.kind);
		return this.walker.parents(node.source).some((edge) => {
			const parentKind = graphNodeKindOf(edge.from.kind);
			return (
				parentKind !== null &&
				rebuildingChanges.includes(edge.change) &&
				stageOf(parentKind) === stage
			);
		});
	}

	// A drop is not a node in lib. Each distinct reason and detail on one owner becomes one node.
	private dropNodes(
		drawnAs: Map<ProvenanceNode, GraphNode>,
	): { node: GraphNode; owner: GraphNode }[] {
		const groups = new Map<string, { node: GraphNode; owner: GraphNode }>();
		for (const drop of this.walker.drops()) {
			const owner =
				drawnAs.get(drop.node) ??
				this.nearest(drop.node, drawnAs, GraphDirection.UP) ??
				this.nearest(drop.node, drawnAs, GraphDirection.DOWN);
			if (owner === undefined) {
				continue;
			}
			const key = `drop:${owner.key}:${this.dropKey(drop)}`;
			if (!groups.has(key)) {
				groups.set(key, {
					owner,
					node: new GraphNode({
						key: GraphNodeKey.Schema.parse(key),
						kind: GraphNodeKind.DROP,
						source: drop.node,
						pair: null,
						drop,
						stack: null,
						warnings: [],
					}),
				});
			}
		}
		return [...groups.values()];
	}

	// The closest node that is drawn, found breadth first through steps that are not. Instruments
	// are never walked through.
	private nearest(
		start: ProvenanceNode,
		drawnAs: Map<ProvenanceNode, GraphNode>,
		direction: GraphDirection,
	): GraphNode | undefined {
		const seen = new Set<ProvenanceNode>([start]);
		const pending: ProvenanceNode[] = [start];
		for (const current of pending) {
			const edges =
				direction === GraphDirection.UP
					? this.walker.parents(current)
					: this.walker.children(current);
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
}
