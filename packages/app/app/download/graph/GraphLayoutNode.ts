import type { GraphDirection } from "~/download/graph/GraphDirection";
import type { GraphLane } from "~/download/graph/GraphLane";
import type { GraphNode } from "~/download/graph/GraphNode";

export type GraphLayoutNodeArgs = {
	node: GraphNode;
	isStub: boolean;
	direction: GraphDirection | null;
	hasMore: boolean;
	column: number;
	lane: GraphLane;
	order: number;
};

// A node of the model as the layout draws it.
export class GraphLayoutNode {
	// A stack node has kind STACK and its stack set.
	public readonly node: GraphNode;
	// Faded: off the main path.
	public readonly isStub: boolean;
	// For a stub or a stack: which side of the node it hangs on.
	public readonly direction: GraphDirection | null;
	// A stub whose own branch goes on, drawn with a mark for it.
	public readonly hasMore: boolean;
	public readonly column: number;
	public readonly lane: GraphLane;
	// Position inside its column and lane, top to bottom.
	public readonly order: number;

	public constructor(args: GraphLayoutNodeArgs) {
		this.node = args.node;
		this.isStub = args.isStub;
		this.direction = args.direction;
		this.hasMore = args.hasMore;
		this.column = args.column;
		this.lane = args.lane;
		this.order = args.order;
	}
}
