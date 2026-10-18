import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";

export type PlacedNodeArgs = {
	layoutNode: GraphLayoutNode;
	x: number;
	y: number;
	width: number;
	height: number;
};

export class PlacedNode {
	public readonly layoutNode: GraphLayoutNode;
	public readonly x: number;
	public readonly y: number;
	public readonly width: number;
	public readonly height: number;

	public constructor(args: PlacedNodeArgs) {
		this.layoutNode = args.layoutNode;
		this.x = args.x;
		this.y = args.y;
		this.width = args.width;
		this.height = args.height;
	}
}
