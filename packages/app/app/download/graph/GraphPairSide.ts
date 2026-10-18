import type { ProvenanceNode } from "@brrr/lib";

export type GraphPairSideArgs = {
	leg: ProvenanceNode;
	line: ProvenanceNode | null;
};

// One side of a pair card: the leg and the report line it became (none when it was left out).
export class GraphPairSide {
	public readonly leg: ProvenanceNode;
	public readonly line: ProvenanceNode | null;

	public constructor(args: GraphPairSideArgs) {
		this.leg = args.leg;
		this.line = args.line;
	}
}
