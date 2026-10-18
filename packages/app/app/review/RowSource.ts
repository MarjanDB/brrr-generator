import type { ProvenanceNode } from "@brrr/lib";

export type RowSourceArgs = {
	row: ProvenanceNode;
	fileName: string;
};

// A broker row and the file it was read from.
export class RowSource {
	// Kind ROW; its fields are the row's attributes.
	public readonly row: ProvenanceNode;
	// The name of the file, as recorded on its FILE node.
	public readonly fileName: string;

	public constructor(args: RowSourceArgs) {
		this.row = args.row;
		this.fileName = args.fileName;
	}
}
