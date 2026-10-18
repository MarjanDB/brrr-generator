import type { PopoverKind } from "~/download/graph/view/PopoverKind";
import type { PopoverRow } from "~/download/graph/view/PopoverRow";
import type { GraphNode } from "~/types/provenanceGraph";

export type PopoverContentArgs = {
	kind: PopoverKind;
	title: GraphNode;
	rows: PopoverRow[];
	fromFile: string | null;
};

// What the popover of a broker row or a report line lists.
export class PopoverContent {
	public readonly kind: PopoverKind;
	// The node it is about: the view takes its icon.
	public readonly title: GraphNode;
	public readonly rows: PopoverRow[];
	// For a broker row: the file it is in.
	public readonly fromFile: string | null;

	public constructor(args: PopoverContentArgs) {
		this.kind = args.kind;
		this.title = args.title;
		this.rows = args.rows;
		this.fromFile = args.fromFile;
	}
}
