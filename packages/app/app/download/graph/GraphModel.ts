import type { ProvenanceNode } from "@brrr/lib";
import type { GraphLane } from "~/download/graph/GraphLane";
import type { GraphModelEdge } from "~/download/graph/GraphModelEdge";
import type { GraphNode } from "~/download/graph/GraphNode";
import type { GraphPair } from "~/download/graph/GraphPair";

export type GraphModelArgs = {
	nodes: GraphNode[];
	edges: GraphModelEdge[];
	pairs: GraphPair[];
	nodeBySource: Map<ProvenanceNode, GraphNode>;
	lanes: Map<GraphNode, GraphLane>;
	rebuilt: Set<GraphNode>;
};

// The visible graph for one mode (every step, or only the steps that matter).
export class GraphModel {
	// In graph order, then the left-out nodes.
	public readonly nodes: GraphNode[];
	public readonly edges: GraphModelEdge[];
	// Empty in the every-step view.
	public readonly pairs: GraphPair[];
	private readonly nodeBySource: Map<ProvenanceNode, GraphNode>;
	private readonly lanes: Map<GraphNode, GraphLane>;
	private readonly rebuilt: Set<GraphNode>;
	private readonly incoming = new Map<GraphNode, GraphModelEdge[]>();
	private readonly outgoing = new Map<GraphNode, GraphModelEdge[]>();

	public constructor(args: GraphModelArgs) {
		this.nodes = args.nodes;
		this.edges = args.edges;
		this.pairs = args.pairs;
		this.nodeBySource = args.nodeBySource;
		this.lanes = args.lanes;
		this.rebuilt = args.rebuilt;
		for (const edge of args.edges) {
			this.append(this.incoming, edge.to, edge);
			this.append(this.outgoing, edge.from, edge);
		}
	}

	public ins(node: GraphNode): GraphModelEdge[] {
		return this.incoming.get(node) ?? [];
	}

	public outs(node: GraphNode): GraphModelEdge[] {
		return this.outgoing.get(node) ?? [];
	}

	// The node a recorded node is drawn as: itself when visible, its pair when it is a matched lot,
	// leg or report line of one, and for a hidden step the first visible node after it (else before).
	public nodeFor(source: ProvenanceNode): GraphNode {
		const node = this.nodeBySource.get(source);
		if (node === undefined) {
			throw new Error(`The graph has no visible node for ${source.id}`);
		}
		return node;
	}

	public laneOf(node: GraphNode): GraphLane {
		const lane = this.lanes.get(node);
		if (lane === undefined) {
			throw new Error(`The graph has no lane for ${node.key}`);
		}
		return lane;
	}

	// In the next column of its stage: a trade after a split, a sum merged per day.
	public isRebuilt(node: GraphNode): boolean {
		return this.rebuilt.has(node);
	}

	private append(
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
}
