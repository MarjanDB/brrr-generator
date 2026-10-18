import type { ImportLeftOutLine } from "~/review/ImportLeftOutLine";
import type { RowSources } from "~/review/RowSources";

export type ImportLeftOutArgs = {
	lines: ImportLeftOutLine[];
	needsALook: number;
	merged: RowSources[];
};

// What the import left out, and what it counted once.
export class ImportLeftOut {
	// By reason in DropReason's order, then by first appearance.
	public readonly lines: ImportLeftOutLine[];
	// How many distinct subjects the import left out.
	public readonly needsALook: number;
	// The records found in more than one export.
	public readonly merged: RowSources[];

	public constructor(args: ImportLeftOutArgs) {
		this.lines = args.lines;
		this.needsALook = args.needsALook;
		this.merged = args.merged;
	}
}
