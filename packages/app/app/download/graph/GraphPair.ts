import type { ProvenanceNode, ReportLeftOut } from "@brrr/lib";
import type { GraphNodeKey } from "~/download/graph/GraphIdentifiers";
import type { GraphPairSide } from "~/download/graph/GraphPairSide";

export type GraphPairArgs = {
	key: GraphNodeKey;
	lot: ProvenanceNode;
	acquired: GraphPairSide;
	sold: GraphPairSide;
	leftOut: ReportLeftOut[];
};

// A matched lot and the two report lines it became, drawn as one card.
export class GraphPair {
	public readonly key: GraphNodeKey;
	public readonly lot: ProvenanceNode;
	public readonly acquired: GraphPairSide;
	public readonly sold: GraphPairSide;
	// Both sides', one per distinct reason and detail.
	public readonly leftOut: ReportLeftOut[];

	public constructor(args: GraphPairArgs) {
		this.key = args.key;
		this.lot = args.lot;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.leftOut = args.leftOut;
	}
}
