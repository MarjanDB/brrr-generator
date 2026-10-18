import type { GraphColumn } from "~/download/graph/GraphColumn";

export type PlacedHeadingArgs = {
	column: GraphColumn;
	x: number;
};

export class PlacedHeading {
	public readonly column: GraphColumn;
	public readonly x: number;

	public constructor(args: PlacedHeadingArgs) {
		this.column = args.column;
		this.x = args.x;
	}
}
