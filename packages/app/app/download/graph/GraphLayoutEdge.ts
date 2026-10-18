import type { ProvenanceChange } from "@brrr/lib";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { SplitFactor } from "~/download/graph/SplitFactor";

export type GraphLayoutEdgeArgs = {
	from: GraphLayoutNode;
	to: GraphLayoutNode;
	isStub: boolean;
	change: ProvenanceChange | null;
	split: SplitFactor | null;
};

export class GraphLayoutEdge {
	public readonly from: GraphLayoutNode;
	public readonly to: GraphLayoutNode;
	// Dashed, faint and not clickable.
	public readonly isStub: boolean;
	// Null for an edge to a left-out node.
	public readonly change: ProvenanceChange | null;
	public readonly split: SplitFactor | null;

	public constructor(args: GraphLayoutEdgeArgs) {
		this.from = args.from;
		this.to = args.to;
		this.isStub = args.isStub;
		this.change = args.change;
		this.split = args.split;
	}
}
