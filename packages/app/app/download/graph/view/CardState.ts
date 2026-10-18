// How a card is drawn next to the chain the user lit.
export enum CardState {
	NORMAL = "NORMAL",
	// The node the graph is centred on.
	FOCUS = "FOCUS",
	// On the lit chain.
	LIT = "LIT",
	// Off the lit chain, while one is lit.
	DIMMED = "DIMMED",
}
