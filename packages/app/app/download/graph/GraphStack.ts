import type { GraphDirection } from "~/download/graph/GraphDirection";
import type { StackKey } from "~/download/graph/GraphIdentifiers";
import type { GraphNode } from "~/download/graph/GraphNode";
import type { GraphNodeKind } from "~/download/graph/GraphNodeKind";

export type GraphStackArgs = {
	key: StackKey;
	owner: GraphNode;
	direction: GraphDirection;
	memberKind: GraphNodeKind;
	members: GraphNode[];
};

// The faded neighbours of one kind that hang on one node, folded into a single card.
export class GraphStack {
	public readonly key: StackKey;
	public readonly owner: GraphNode;
	public readonly direction: GraphDirection;
	public readonly memberKind: GraphNodeKind;
	public readonly members: GraphNode[];

	public constructor(args: GraphStackArgs) {
		this.key = args.key;
		this.owner = args.owner;
		this.direction = args.direction;
		this.memberKind = args.memberKind;
		this.members = args.members;
	}
}
