import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { PlacedBand } from "~/download/graph/PlacedBand";
import type { PlacedEdge } from "~/download/graph/PlacedEdge";
import type { PlacedHeading } from "~/download/graph/PlacedHeading";
import type { PlacedNode } from "~/download/graph/PlacedNode";

export type GraphPlacementArgs = {
	width: number;
	height: number;
	nodes: PlacedNode[];
	edges: PlacedEdge[];
	bands: PlacedBand[];
	headings: PlacedHeading[];
};

// A layout in pixels.
export class GraphPlacement {
	public readonly width: number;
	public readonly height: number;
	public readonly nodes: PlacedNode[];
	public readonly edges: PlacedEdge[];
	public readonly bands: PlacedBand[];
	public readonly headings: PlacedHeading[];
	private readonly byLayoutNode = new Map<GraphLayoutNode, PlacedNode>();

	public constructor(args: GraphPlacementArgs) {
		this.width = args.width;
		this.height = args.height;
		this.nodes = args.nodes;
		this.edges = args.edges;
		this.bands = args.bands;
		this.headings = args.headings;
		for (const placed of args.nodes) {
			this.byLayoutNode.set(placed.layoutNode, placed);
		}
	}

	public placedNodeOf(node: GraphLayoutNode): PlacedNode {
		const placed = this.byLayoutNode.get(node);
		if (placed === undefined) {
			throw new Error("The node is not in this placement");
		}
		return placed;
	}
}
