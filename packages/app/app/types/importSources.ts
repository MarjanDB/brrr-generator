import type { ProvenanceDrop, ProvenanceNode } from "@brrr/lib";

// Which key attributes a row's popover lists.
export enum RowSourceKind {
	TRADE = "TRADE",
	CASH_TRANSACTION = "CASH_TRANSACTION",
}

// A broker row and the file it was read from.
export type RowSource = {
	// Kind ROW; its fields are the row's attributes.
	row: ProvenanceNode;
	// The name of the file, as recorded on its FILE node.
	fileName: string;
};

// The row an event or record was taken from, and the copies counted into it.
export type RowSources = {
	row: RowSource;
	// In graph order; empty when nothing was deduplicated into the row.
	alsoIn: RowSource[];
};

// One sentence about what the import left out, with the files and rows behind it.
export type ImportLeftOutLine = {
	// The line's first drop; its reason and detail make the sentence.
	drop: ProvenanceDrop;
	// The rows behind all the line's drops, each once.
	rows: RowSource[];
	// The names of the files left out whole, each once, in drop order.
	files: string[];
};

// What the import left out, and what it counted once.
export type ImportLeftOut = {
	// By reason in DropReason's order, then by first appearance.
	lines: ImportLeftOutLine[];
	// How many distinct subjects the import left out.
	needsALook: number;
	// The records found in more than one export.
	merged: RowSources[];
};

// One attribute of a broker row, by the name the export gives it.
export type RowAttribute = { name: string; value: string };
