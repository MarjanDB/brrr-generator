import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphPoint } from "~/download/graph/GraphPoint";

export type PlacedEdgeArgs = {
	edge: GraphLayoutEdge;
	from: GraphPoint;
	to: GraphPoint;
	path: string;
	badge: GraphPoint | null;
};

export class PlacedEdge {
	public readonly edge: GraphLayoutEdge;
	public readonly from: GraphPoint;
	public readonly to: GraphPoint;
	// An SVG path: a cubic curve from one anchor to the other.
	public readonly path: string;
	// Where the split badge goes; null for an edge that is not a split.
	public readonly badge: GraphPoint | null;

	public constructor(args: PlacedEdgeArgs) {
		this.edge = args.edge;
		this.from = args.from;
		this.to = args.to;
		this.path = args.path;
		this.badge = args.badge;
	}
}
