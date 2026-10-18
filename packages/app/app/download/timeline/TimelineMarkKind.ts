// What a mark on the timeline stands for. Declared in the order marks on the same day are listed:
// trades and cash first, so they sit on the row the arcs start from, then actions and broker lots.
export enum TimelineMarkKind {
	BOUGHT = "BOUGHT",
	SOLD = "SOLD",
	DIVIDEND = "DIVIDEND",
	TAX = "TAX",
	CORPORATE_ACTION = "CORPORATE_ACTION",
	BROKER_LOT = "BROKER_LOT",
}
