import type { ProvenanceChange, ProvenanceNode } from "@brrr/lib";
import {
	type GraphColumn,
	GraphDirection,
	GraphLane,
	type GraphLayout,
	type GraphLayoutEdge,
	type GraphLayoutNode,
	type GraphMetrics,
	type GraphModel,
	type GraphModelEdge,
	type GraphNode,
	GraphNodeKey,
	GraphNodeKind,
	type GraphPlacement,
	type GraphPoint,
	type PlacedBand,
	type PlacedNode,
	type SplitFactor,
	StackKey,
} from "~/types/provenanceGraph";
import { edgeCurve } from "~/utils/edgeCurve";
import {
	headingOf,
	modelIns,
	modelIsRebuilt,
	modelLaneOf,
	modelNodeFor,
	modelOuts,
	stageOf,
} from "~/utils/graphModel";

export type GraphLayoutOptions = {
	// Any recorded node; it is resolved with the model's node lookup.
	focus: ProvenanceNode;
	// The stacks the user spread out.
	expanded: ReadonlySet<StackKey>;
};

// A node on its way to the layout: what is known before columns and order are.
type Draft = {
	node: GraphNode;
	isStub: boolean;
	direction: GraphDirection | null;
	hasMore: boolean;
	lane: GraphLane;
};

type DraftEdge = {
	from: Draft;
	to: Draft;
	isStub: boolean;
	change: ProvenanceChange | null;
	split: SplitFactor | null;
};

// More than this many neighbours of one kind on one side fold into a stack.
const stackFrom = 3;

const lanesTopToBottom = [GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD];

export function layoutGraph(model: GraphModel, options: GraphLayoutOptions): GraphLayout {
	const focus = modelNodeFor(model, options.focus);
	const main = new Set<GraphNode>([
		...closure(focus, (node) => modelIns(model, node).map((edge) => edge.from)),
		...closure(focus, (node) => modelOuts(model, node).map((edge) => edge.to)),
	]);

	const drafts = new Map<GraphNode, Draft>();
	const edges: DraftEdge[] = [];
	for (const node of model.nodes) {
		if (main.has(node)) {
			drafts.set(node, {
				node,
				isStub: false,
				direction: null,
				hasMore: false,
				lane: modelLaneOf(model, node),
			});
		}
	}
	for (const edge of model.edges) {
		const from = drafts.get(edge.from);
		const to = drafts.get(edge.to);
		if (from !== undefined && to !== undefined) {
			edges.push({ from, to, isStub: false, change: edge.change, split: edge.split });
		}
	}

	const stubs = new Map<GraphNode, Draft>();
	const mainDrafts = [...drafts.values()];
	for (const owner of mainDrafts) {
		for (const direction of [GraphDirection.UP, GraphDirection.DOWN]) {
			const up = direction === GraphDirection.UP;
			const off = (up ? modelIns(model, owner.node) : modelOuts(model, owner.node)).filter(
				(edge) => !main.has(up ? edge.from : edge.to),
			);
			for (const [kind, group] of groupByKind(off, up)) {
				const key = StackKey.of(owner.node.key, direction, kind);
				if (group.length >= stackFrom && !options.expanded.has(key)) {
					const stack = stackDraft({ model, owner: owner.node, direction, kind, key, group, up });
					edges.push({
						from: up ? stack : owner,
						to: up ? owner : stack,
						isStub: true,
						change: group[0]?.change ?? null,
						split: null,
					});
					stubs.set(stack.node, stack);
					continue;
				}
				for (const edge of group) {
					const other = up ? edge.from : edge.to;
					let stub = stubs.get(other);
					if (stub === undefined) {
						stub = {
							node: other,
							isStub: true,
							direction,
							hasMore: (up ? modelIns(model, other) : modelOuts(model, other)).length > 0,
							lane: modelLaneOf(model, other),
						};
						stubs.set(other, stub);
					}
					edges.push({
						from: up ? stub : owner,
						to: up ? owner : stub,
						isStub: true,
						change: edge.change,
						split: edge.split,
					});
				}
			}
		}
	}

	const all = [...mainDrafts, ...stubs.values()];
	const stages = columnStages(all, model);
	const orders = orderWithinLanes(all, edges, stages);
	const layoutNodes = new Map<Draft, GraphLayoutNode>();
	for (const draft of all) {
		layoutNodes.set(draft, {
			node: draft.node,
			isStub: draft.isStub,
			direction: draft.direction,
			hasMore: draft.hasMore,
			column: stages.get(draft) ?? 0,
			lane: draft.lane,
			order: orders.get(draft) ?? 0,
		});
	}
	const layoutEdges = edges.map((edge): GraphLayoutEdge => {
		const from = layoutNodes.get(edge.from);
		const to = layoutNodes.get(edge.to);
		if (from === undefined || to === undefined) {
			throw new Error("A layout edge ends on a node the layout does not draw");
		}
		return { from, to, isStub: edge.isStub, change: edge.change, split: edge.split };
	});
	const focusDraft = drafts.get(focus);
	const focusNode = focusDraft === undefined ? undefined : layoutNodes.get(focusDraft);
	if (focusNode === undefined) {
		throw new Error("The focus is not in the layout");
	}
	const nodes = [...layoutNodes.values()];
	return {
		focus: focusNode,
		nodes,
		edges: layoutEdges,
		columns: columnsOf(all, stages, model),
		lanes: lanesTopToBottom.filter((lane) => nodes.some((node) => node.lane === lane)),
		byNode: byNodeOf(nodes),
		bySource: bySourceOf(nodes),
	};
}

function byNodeOf(nodes: GraphLayoutNode[]): Map<GraphNode, GraphLayoutNode> {
	return new Map(nodes.map((layoutNode) => [layoutNode.node, layoutNode]));
}

function bySourceOf(nodes: GraphLayoutNode[]): Map<ProvenanceNode, GraphLayoutNode> {
	const bySource = new Map<ProvenanceNode, GraphLayoutNode>();
	for (const layoutNode of nodes) {
		const node = layoutNode.node;
		if (node.pair !== null) {
			for (const member of [
				node.pair.lot,
				node.pair.acquired.leg,
				node.pair.sold.leg,
				node.pair.acquired.line,
				node.pair.sold.line,
			]) {
				if (member !== null) {
					bySource.set(member, layoutNode);
				}
			}
		} else if (node.kind !== GraphNodeKind.DROP && node.source !== null) {
			bySource.set(node.source, layoutNode);
		}
	}
	return bySource;
}

// Where a recorded node is drawn: itself, or the pair of a lot, leg or report line. Null for a
// node that is not drawn, hidden steps and the instrument included.
export function layoutNodeOf(layout: GraphLayout, source: ProvenanceNode): GraphLayoutNode | null {
	return layout.bySource.get(source) ?? null;
}

export function layoutNodeFor(layout: GraphLayout, node: GraphNode): GraphLayoutNode | null {
	return layout.byNode.get(node) ?? null;
}

// The node that stands for a draft when it is named or staged: a stack stands for its members.
function representative(draft: Draft): GraphNode {
	return draft.node.stack?.members[0] ?? draft.node;
}

// The column index of each draft: its stage (one more when rebuilt) among the stages in use.
function columnStages(drafts: Draft[], model: GraphModel): Map<Draft, number> {
	const stageOfDraft = (draft: Draft): number => {
		const node = representative(draft);
		return stageOf(node.kind) + (modelIsRebuilt(model, node) ? 1 : 0);
	};
	const used = [...new Set(drafts.map(stageOfDraft))].sort((left, right) => left - right);
	return new Map(drafts.map((draft) => [draft, used.indexOf(stageOfDraft(draft))]));
}

function columnsOf(
	drafts: Draft[],
	columnOf: Map<Draft, number>,
	model: GraphModel,
): GraphColumn[] {
	const count = Math.max(-1, ...columnOf.values()) + 1;
	return Array.from({ length: count }, (_, index) => {
		const inColumn = drafts.filter((draft) => columnOf.get(draft) === index);
		const main = inColumn.filter((draft) => !draft.isStub);
		const named = main.length > 0 ? main : inColumn;
		const headings = named.map((draft) => {
			const node = representative(draft);
			return headingOf(node, modelIsRebuilt(model, node));
		});
		return { index, headings: [...new Set(headings)] };
	});
}

// Six alternating sweeps over the columns, each putting a column's nodes in lane order and then
// in the mean position of their neighbours on the side just swept. Returns each draft's position
// inside its column and lane. Nothing random: the same input gives the same order.
function orderWithinLanes(
	drafts: Draft[],
	edges: DraftEdge[],
	columnOf: Map<Draft, number>,
): Map<Draft, number> {
	const left = new Map<Draft, Draft[]>();
	const right = new Map<Draft, Draft[]>();
	for (const edge of edges) {
		left.set(edge.to, [...(left.get(edge.to) ?? []), edge.from]);
		right.set(edge.from, [...(right.get(edge.from) ?? []), edge.to]);
	}
	const columns = new Map<number, Draft[]>();
	for (const draft of drafts) {
		const index = columnOf.get(draft) ?? 0;
		columns.set(index, [...(columns.get(index) ?? []), draft]);
	}
	const indexes = [...columns.keys()].sort((a, b) => a - b);
	const position = new Map<Draft, number>();
	for (const members of columns.values()) {
		members.forEach((draft, place) => {
			position.set(draft, place);
		});
	}
	const positionOf = (draft: Draft): number => position.get(draft) ?? 0;
	for (let sweep = 0; sweep < 6; sweep++) {
		const towardsLeft = sweep % 2 === 0;
		for (const index of towardsLeft ? indexes : [...indexes].reverse()) {
			const members = columns.get(index) ?? [];
			const scores = new Map<Draft, number>();
			for (const draft of members) {
				const neighbours = (towardsLeft ? left : right).get(draft) ?? [];
				scores.set(
					draft,
					neighbours.length === 0
						? positionOf(draft)
						: neighbours.reduce((sum, neighbour) => sum + positionOf(neighbour), 0) /
								neighbours.length,
				);
			}
			members.sort(
				(a, b) =>
					lanesTopToBottom.indexOf(a.lane) - lanesTopToBottom.indexOf(b.lane) ||
					(scores.get(a) ?? 0) - (scores.get(b) ?? 0) ||
					Number(a.isStub) - Number(b.isStub),
			);
			members.forEach((draft, place) => {
				position.set(draft, place);
			});
		}
	}
	const orders = new Map<Draft, number>();
	for (const members of columns.values()) {
		for (const lane of lanesTopToBottom) {
			members
				.filter((draft) => draft.lane === lane)
				.forEach((draft, place) => {
					orders.set(draft, place);
				});
		}
	}
	return orders;
}

// Every node reachable from the start, the start included, in the order found.
function closure(start: GraphNode, next: (node: GraphNode) => GraphNode[]): GraphNode[] {
	const seen = new Set<GraphNode>([start]);
	const pending: GraphNode[] = [start];
	for (const node of pending) {
		for (const neighbour of next(node)) {
			if (!seen.has(neighbour)) {
				seen.add(neighbour);
				pending.push(neighbour);
			}
		}
	}
	return pending;
}

function groupByKind(edges: GraphModelEdge[], up: boolean): Map<GraphNodeKind, GraphModelEdge[]> {
	const groups = new Map<GraphNodeKind, GraphModelEdge[]>();
	for (const edge of edges) {
		const kind = (up ? edge.from : edge.to).kind;
		const group = groups.get(kind);
		if (group === undefined) {
			groups.set(kind, [edge]);
		} else {
			group.push(edge);
		}
	}
	return groups;
}

type StackArgs = {
	model: GraphModel;
	owner: GraphNode;
	direction: GraphDirection;
	kind: GraphNodeKind;
	key: StackKey;
	group: GraphModelEdge[];
	up: boolean;
};

// The faded card standing for a group of neighbours: its lane is the members' when they share one.
function stackDraft(args: StackArgs): Draft {
	const members = args.group.map((edge) => (args.up ? edge.from : edge.to));
	const lanes = new Set(members.map((member) => modelLaneOf(args.model, member)));
	const [only] = [...lanes];
	const stackKey = GraphNodeKey.Schema.parse(`stack:${args.key}`);
	const node: GraphNode = {
		key: stackKey,
		kind: GraphNodeKind.STACK,
		source: null,
		pair: null,
		drop: null,
		stack: {
			key: args.key,
			owner: args.owner,
			direction: args.direction,
			memberKind: args.kind,
			members,
		},
		warnings: [],
	};
	return {
		node,
		isStub: true,
		direction: args.direction,
		hasMore: false,
		lane: lanes.size === 1 && only !== undefined ? only : GraphLane.MIDDLE,
	};
}

// The sizes the placement works from. The defaults are the sketch's numbers.
export const defaultGraphMetrics: GraphMetrics = {
	nodeWidth: 162,
	nodeHeight: 38,
	pairHeaderHeight: 26,
	pairRowHeight: 25,
	columnGap: 58,
	rowGap: 12,
	bandGap: 26,
	left: 70,
	top: 30,
};

// Room to the right of the last column, and below the last band.
const rightMargin = 20;
const bottomMargin = 6;

// Puts a layout in pixels. Lanes are bands across the whole graph, as tall as their tallest column;
// a column's nodes in a band are centred in it, in their order.
export function placeGraph(layout: GraphLayout, metrics: GraphMetrics): GraphPlacement {
	const heightOf = (node: GraphLayoutNode): number =>
		node.node.kind === GraphNodeKind.PAIR
			? metrics.pairHeaderHeight + 2 * metrics.pairRowHeight
			: metrics.nodeHeight;
	const stackHeight = (nodes: GraphLayoutNode[]): number =>
		nodes.reduce((sum, node) => sum + heightOf(node), 0) +
		Math.max(0, nodes.length - 1) * metrics.rowGap;
	const inCell = (column: number, lane: GraphLane): GraphLayoutNode[] =>
		layout.nodes
			.filter((node) => node.column === column && node.lane === lane)
			.sort((a, b) => a.order - b.order);

	const bandHeights = new Map<GraphLane, number>();
	for (const lane of lanesTopToBottom) {
		bandHeights.set(
			lane,
			Math.max(0, ...layout.columns.map((column) => stackHeight(inCell(column.index, lane)))),
		);
	}

	const bands: PlacedBand[] = [];
	const bandTops = new Map<GraphLane, number>();
	let y = metrics.top;
	for (const lane of lanesTopToBottom) {
		const height = bandHeights.get(lane) ?? 0;
		bandTops.set(lane, y);
		if (height > 0) {
			bands.push({ lane, y, height });
			y += height + metrics.bandGap;
		}
	}

	const columnX = (index: number): number =>
		metrics.left + index * (metrics.nodeWidth + metrics.columnGap);
	const placedNodes: PlacedNode[] = [];
	for (const column of layout.columns) {
		for (const lane of lanesTopToBottom) {
			const nodes = inCell(column.index, lane);
			const bandTop = bandTops.get(lane) ?? 0;
			let top = bandTop + ((bandHeights.get(lane) ?? 0) - stackHeight(nodes)) / 2;
			for (const node of nodes) {
				placedNodes.push({
					layoutNode: node,
					x: columnX(column.index),
					y: top,
					width: metrics.nodeWidth,
					height: heightOf(node),
				});
				top += heightOf(node) + metrics.rowGap;
			}
		}
	}
	const placedOf = new Map(placedNodes.map((placed) => [placed.layoutNode, placed]));

	const placedEdges = layout.edges.map((edge) => {
		const source = placedOf.get(edge.from);
		const target = placedOf.get(edge.to);
		if (source === undefined || target === undefined) {
			throw new Error("An edge ends on a node that was not placed");
		}
		const from = { x: source.x + source.width, y: source.y + source.height / 2 };
		const to = entryPoint(edge, target, metrics);
		return {
			edge,
			from,
			to,
			path: edgeCurve(from, to),
			badge: edge.split === null ? null : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
		};
	});

	const lastBand = bands[bands.length - 1];
	return {
		width: columnX(layout.columns.length) - metrics.columnGap + rightMargin,
		height: (lastBand === undefined ? metrics.top : lastBand.y + lastBand.height) + bottomMargin,
		nodes: placedNodes,
		edges: placedEdges,
		bands,
		headings: layout.columns.map((column) => ({ column, x: columnX(column.index) })),
		byLayoutNode: placedOf,
	};
}

export function placedNodeOf(placement: GraphPlacement, node: GraphLayoutNode): PlacedNode {
	const placed = placement.byLayoutNode.get(node);
	if (placed === undefined) {
		throw new Error("The node is not in this placement");
	}
	return placed;
}

// Where an edge meets the node it enters: the middle of its left side, except on a pair card, where
// an edge from the acquired side meets the buy row and one from the sold side the sell row.
function entryPoint(edge: GraphLayoutEdge, target: PlacedNode, metrics: GraphMetrics): GraphPoint {
	const middle = { x: target.x, y: target.y + target.height / 2 };
	if (target.layoutNode.node.kind !== GraphNodeKind.PAIR) {
		return middle;
	}
	switch (edge.from.lane) {
		case GraphLane.ACQUIRED:
			return { x: target.x, y: target.y + metrics.pairHeaderHeight + metrics.pairRowHeight / 2 };
		case GraphLane.SOLD:
			return {
				x: target.x,
				y: target.y + metrics.pairHeaderHeight + metrics.pairRowHeight * 1.5,
			};
		case GraphLane.MIDDLE:
			return middle;
	}
}
