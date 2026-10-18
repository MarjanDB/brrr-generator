import type { ProvenanceDrop } from "@brrr/Provenance/Models/ProvenanceDrop";
import type { ProvenanceEdge } from "@brrr/Provenance/Models/ProvenanceEdge";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";

export type ProvenanceSliceArgs = {
	nodes: ProvenanceNode[];
	edges: ProvenanceEdge[];
	drops: ProvenanceDrop[];
};

export class ProvenanceSlice {
	public readonly nodes: ProvenanceNode[];
	public readonly edges: ProvenanceEdge[];
	public readonly drops: ProvenanceDrop[];

	public constructor(args: ProvenanceSliceArgs) {
		this.nodes = args.nodes;
		this.edges = args.edges;
		this.drops = args.drops;
	}
}
