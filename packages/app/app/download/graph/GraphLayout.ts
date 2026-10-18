import type { ProvenanceNode } from "@brrr/lib";
import type { GraphColumn } from "~/download/graph/GraphColumn";
import { GraphLane } from "~/download/graph/GraphLane";
import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";

export type GraphLayoutArgs = {
	focus: GraphLayoutNode;
	nodes: GraphLayoutNode[];
	edges: GraphLayoutEdge[];
	columns: GraphColumn[];
};

// What the graph shows for one focus: the main path, the faded stubs and stacks around it, and
// where each sits (column, lane, order).
export class GraphLayout {
	public readonly focus: GraphLayoutNode;
	public readonly nodes: GraphLayoutNode[];
	public readonly edges: GraphLayoutEdge[];
	// Only the stages in use, left to right.
	public readonly columns: GraphColumn[];
	// The lanes with at least one node, top to bottom.
	public readonly lanes: GraphLane[];
	private readonly byNode = new Map<GraphNode, GraphLayoutNode>();
	private readonly bySource = new Map<ProvenanceNode, GraphLayoutNode>();

	public constructor(args: GraphLayoutArgs) {
		this.focus = args.focus;
		this.nodes = args.nodes;
		this.edges = args.edges;
		this.columns = args.columns;
		this.lanes = [GraphLane.ACQUIRED, GraphLane.MIDDLE, GraphLane.SOLD].filter((lane) =>
			args.nodes.some((node) => node.lane === lane),
		);
		for (const layoutNode of args.nodes) {
			const node = layoutNode.node;
			this.byNode.set(node, layoutNode);
			if (node.pair !== null) {
				for (const member of [
					node.pair.lot,
					node.pair.acquired.leg,
					node.pair.sold.leg,
					node.pair.acquired.line,
					node.pair.sold.line,
				]) {
					if (member !== null) {
						this.bySource.set(member, layoutNode);
					}
				}
			} else if (node.kind !== GraphNodeKind.DROP && node.source !== null) {
				this.bySource.set(node.source, layoutNode);
			}
		}
	}

	// Where a recorded node is drawn: itself, or the pair of a lot, leg or report line. Null for a
	// node that is not drawn, hidden steps and the instrument included.
	public layoutNodeOf(source: ProvenanceNode): GraphLayoutNode | null {
		return this.bySource.get(source) ?? null;
	}

	public layoutNodeFor(node: GraphNode): GraphLayoutNode | null {
		return this.byNode.get(node) ?? null;
	}
}
