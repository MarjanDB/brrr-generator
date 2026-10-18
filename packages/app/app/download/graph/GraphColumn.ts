import type { GraphHeading } from "~/download/graph/GraphHeading";

export type GraphColumnArgs = {
	index: number;
	headings: GraphHeading[];
};

// One column of the layout. Only the stages in use get one.
export class GraphColumn {
	public readonly index: number;
	// Distinct, in the order first seen. The view maps each to its text.
	public readonly headings: GraphHeading[];

	public constructor(args: GraphColumnArgs) {
		this.index = args.index;
		this.headings = args.headings;
	}
}
