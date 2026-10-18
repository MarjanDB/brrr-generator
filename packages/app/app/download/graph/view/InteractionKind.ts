// What the user did in the graph.
export enum InteractionKind {
	// Clicked a node on the main path.
	NODE = "NODE",
	// Clicked a faded stub, or double-clicked a node: move the focus to it.
	STUB = "STUB",
	// Clicked a folded stack.
	STACK = "STACK",
	// Clicked an edge.
	EDGE = "EDGE",
	// Clicked one of the two lines of a pair card.
	PAIR_ROW = "PAIR_ROW",
	BACKGROUND = "BACKGROUND",
	ESCAPE = "ESCAPE",
}
