import type { ProvenanceDrop, ProvenanceNode, ProvenanceWarning } from "@brrr/lib";
import type { GraphNodeKey } from "~/download/graph/GraphIdentifiers";
import type { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import type { GraphPair } from "~/download/graph/GraphPair";
import type { GraphStack } from "~/download/graph/GraphStack";

export type GraphNodeArgs = {
	key: GraphNodeKey;
	kind: GraphNodeKind;
	source: ProvenanceNode | null;
	pair: GraphPair | null;
	drop: ProvenanceDrop | null;
	stack: GraphStack | null;
	warnings: ProvenanceWarning[];
};

// One node of the visible graph. Which of source, pair, drop and stack is set follows from its kind:
// a PAIR has its pair and the lot as source, a DROP its drop and the node the drop is on as source,
// a STACK (made by the layout) its stack, anything else its source.
export class GraphNode {
	public readonly key: GraphNodeKey;
	public readonly kind: GraphNodeKind;
	public readonly source: ProvenanceNode | null;
	public readonly pair: GraphPair | null;
	public readonly drop: ProvenanceDrop | null;
	public readonly stack: GraphStack | null;
	public readonly warnings: ProvenanceWarning[];

	public constructor(args: GraphNodeArgs) {
		this.key = args.key;
		this.kind = args.kind;
		this.source = args.source;
		this.pair = args.pair;
		this.drop = args.drop;
		this.stack = args.stack;
		this.warnings = args.warnings;
	}
}
