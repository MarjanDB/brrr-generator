import type { GraphLane } from "~/download/graph/GraphLane";

export type PlacedBandArgs = {
	lane: GraphLane;
	y: number;
	height: number;
};

// A lane, drawn as a band across the whole graph.
export class PlacedBand {
	public readonly lane: GraphLane;
	public readonly y: number;
	public readonly height: number;

	public constructor(args: PlacedBandArgs) {
		this.lane = args.lane;
		this.y = args.y;
		this.height = args.height;
	}
}
