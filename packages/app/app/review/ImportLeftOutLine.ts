import type { ProvenanceDrop } from "@brrr/lib";
import type { RowSource } from "~/review/RowSource";

export type ImportLeftOutLineArgs = {
	drop: ProvenanceDrop;
	rows: RowSource[];
	files: string[];
};

// One sentence about what the import left out, with the files and rows behind it.
export class ImportLeftOutLine {
	// The line's first drop; its reason and detail make the sentence.
	public readonly drop: ProvenanceDrop;
	// The rows behind all the line's drops, each once.
	public readonly rows: RowSource[];
	// The names of the files left out whole, each once, in drop order.
	public readonly files: string[];

	public constructor(args: ImportLeftOutLineArgs) {
		this.drop = args.drop;
		this.rows = args.rows;
		this.files = args.files;
	}
}
