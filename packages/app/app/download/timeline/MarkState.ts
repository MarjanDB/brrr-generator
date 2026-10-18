// How a mark is drawn against the focus: the item itself, part of the chain the user picked,
// something else while a chain is picked, or nothing special.
export enum MarkState {
	NORMAL = "NORMAL",
	FOCUSED = "FOCUSED",
	LIT = "LIT",
	DIMMED = "DIMMED",
}
