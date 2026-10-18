import type { ProvenanceNode } from "@brrr/lib";
import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";

export type GraphChainArgs = {
	nodes: ReadonlySet<GraphLayoutNode>;
	edges: ReadonlySet<GraphLayoutEdge>;
	sources: ReadonlySet<ProvenanceNode>;
};

// What lights up when a node or an edge is clicked: everything on the path through it, and nothing
// faded.
export class GraphChain {
	public readonly nodes: ReadonlySet<GraphLayoutNode>;
	public readonly edges: ReadonlySet<GraphLayoutEdge>;
	// Every recorded node the chain stands for: a pair brings its matched lot, both legs and both
	// lines. The timeline lights its events from this.
	public readonly sources: ReadonlySet<ProvenanceNode>;

	public constructor(args: GraphChainArgs) {
		this.nodes = args.nodes;
		this.edges = args.edges;
		this.sources = args.sources;
	}
}
