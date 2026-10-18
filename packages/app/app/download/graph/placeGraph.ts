import { GraphLane } from "~/download/graph/GraphLane";
import type { GraphLayout } from "~/download/graph/GraphLayout";
import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { GraphMetrics } from "~/download/graph/GraphMetrics";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { GraphPlacement } from "~/download/graph/GraphPlacement";
import type { GraphPoint } from "~/download/graph/GraphPoint";
import { PlacedBand } from "~/download/graph/PlacedBand";
import { PlacedEdge } from "~/download/graph/PlacedEdge";
import { PlacedHeading } from "~/download/graph/PlacedHeading";
import { PlacedNode } from "~/download/graph/PlacedNode";

const lanesTopToBottom = [GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD];

// Edges bend at least this far out of a node, so a short hop still reads as a curve.
const minimumBend = 24;

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
			bands.push(new PlacedBand({ lane, y, height }));
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
				placedNodes.push(
					new PlacedNode({
						layoutNode: node,
						x: columnX(column.index),
						y: top,
						width: metrics.nodeWidth,
						height: heightOf(node),
					}),
				);
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
		const bend = Math.max(minimumBend, (to.x - from.x) / 2);
		return new PlacedEdge({
			edge,
			from,
			to,
			path: `M${from.x},${from.y} C${from.x + bend},${from.y} ${to.x - bend},${to.y} ${to.x},${to.y}`,
			badge: edge.split === null ? null : { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
		});
	});

	const lastBand = bands[bands.length - 1];
	return new GraphPlacement({
		width: columnX(layout.columns.length) - metrics.columnGap + rightMargin,
		height: (lastBand === undefined ? metrics.top : lastBand.y + lastBand.height) + bottomMargin,
		nodes: placedNodes,
		edges: placedEdges,
		bands,
		headings: layout.columns.map(
			(column) => new PlacedHeading({ column, x: columnX(column.index) }),
		),
	});
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
