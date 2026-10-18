import type { RowSource } from "~/review/RowSource";

export type RowSourcesArgs = {
	row: RowSource;
	alsoIn: RowSource[];
};

// The row an event or record was taken from, and the copies counted into it.
export class RowSources {
	public readonly row: RowSource;
	// In graph order; empty when nothing was deduplicated into the row.
	public readonly alsoIn: RowSource[];

	public constructor(args: RowSourcesArgs) {
		this.row = args.row;
		this.alsoIn = args.alsoIn;
	}
}
