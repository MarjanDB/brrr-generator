import type { ProvenanceChange, ProvenanceNode } from "@brrr/lib";
import { GraphColumn } from "~/download/graph/GraphColumn";
import { GraphDirection } from "~/download/graph/GraphDirection";
import { GraphNodeKey, StackKey } from "~/download/graph/GraphIdentifiers";
import { GraphLane } from "~/download/graph/GraphLane";
import { GraphLayout } from "~/download/graph/GraphLayout";
import { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { GraphModel } from "~/download/graph/GraphModel";
import type { GraphModelEdge } from "~/download/graph/GraphModelEdge";
import { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { GraphStack } from "~/download/graph/GraphStack";
import { stageOf } from "~/download/graph/GraphStage";
import { headingOf } from "~/download/graph/headingOf";
import type { SplitFactor } from "~/download/graph/SplitFactor";

export type GraphLayoutOptions = {
	// Any recorded node; it is resolved with the model's nodeFor.
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

export function layoutGraph(model: GraphModel, options: GraphLayoutOptions): GraphLayout {
	const focus = model.nodeFor(options.focus);
	const main = new Set<GraphNode>([
		...closure(focus, (node) => model.ins(node).map((edge) => edge.from)),
		...closure(focus, (node) => model.outs(node).map((edge) => edge.to)),
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
				lane: model.laneOf(node),
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
			const off = (up ? model.ins(owner.node) : model.outs(owner.node)).filter(
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
							hasMore: (up ? model.ins(other) : model.outs(other)).length > 0,
							lane: model.laneOf(other),
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
		layoutNodes.set(
			draft,
			new GraphLayoutNode({
				node: draft.node,
				isStub: draft.isStub,
				direction: draft.direction,
				hasMore: draft.hasMore,
				column: stages.get(draft) ?? 0,
				lane: draft.lane,
				order: orders.get(draft) ?? 0,
			}),
		);
	}
	const layoutEdges = edges.map((edge) => {
		const from = layoutNodes.get(edge.from);
		const to = layoutNodes.get(edge.to);
		if (from === undefined || to === undefined) {
			throw new Error("A layout edge ends on a node the layout does not draw");
		}
		return new GraphLayoutEdge({
			from,
			to,
			isStub: edge.isStub,
			change: edge.change,
			split: edge.split,
		});
	});
	const focusDraft = drafts.get(focus);
	const focusNode = focusDraft === undefined ? undefined : layoutNodes.get(focusDraft);
	if (focusNode === undefined) {
		throw new Error("The focus is not in the layout");
	}
	return new GraphLayout({
		focus: focusNode,
		nodes: [...layoutNodes.values()],
		edges: layoutEdges,
		columns: columnsOf(all, stages, model),
	});
}

// The node that stands for a draft when it is named or staged: a stack stands for its members.
function representative(draft: Draft): GraphNode {
	return draft.node.stack?.members[0] ?? draft.node;
}

// The column index of each draft: its stage (one more when rebuilt) among the stages in use.
function columnStages(drafts: Draft[], model: GraphModel): Map<Draft, number> {
	const stageOfDraft = (draft: Draft): number => {
		const node = representative(draft);
		return stageOf(node.kind) + (model.isRebuilt(node) ? 1 : 0);
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
			return headingOf(node, model.isRebuilt(node));
		});
		return new GraphColumn({ index, headings: [...new Set(headings)] });
	});
}

const laneRank = [GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD];

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
					laneRank.indexOf(a.lane) - laneRank.indexOf(b.lane) ||
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
		for (const lane of laneRank) {
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
	const lanes = new Set(members.map((member) => args.model.laneOf(member)));
	const [only] = [...lanes];
	const stackKey = GraphNodeKey.Schema.parse(`stack:${args.key}`);
	const node = new GraphNode({
		key: stackKey,
		kind: GraphNodeKind.STACK,
		source: null,
		pair: null,
		drop: null,
		stack: new GraphStack({
			key: args.key,
			owner: args.owner,
			direction: args.direction,
			memberKind: args.kind,
			members,
		}),
		warnings: [],
	});
	return {
		node,
		isStub: true,
		direction: args.direction,
		hasMore: false,
		lane: lanes.size === 1 && only !== undefined ? only : GraphLane.MIDDLE,
	};
}
