import type { ProvenanceChange } from "@brrr/lib";
import type { GraphNode } from "~/download/graph/GraphNode";
import type { SplitFactor } from "~/download/graph/SplitFactor";

export type GraphModelEdgeArgs = {
	from: GraphNode;
	to: GraphNode;
	change: ProvenanceChange | null;
	split: SplitFactor | null;
};

// One edge of the visible graph: what the hidden steps between two visible nodes folded into.
export class GraphModelEdge {
	public readonly from: GraphNode;
	public readonly to: GraphNode;
	// The change of the first recorded edge on the folded path. Null for an edge to a left-out
	// node: no stage recorded that one.
	public readonly change: ProvenanceChange | null;
	// Set when a SPLIT edge joins a trade and the one rebuilt from it.
	public readonly split: SplitFactor | null;

	public constructor(args: GraphModelEdgeArgs) {
		this.from = args.from;
		this.to = args.to;
		this.change = args.change;
		this.split = args.split;
	}
}
