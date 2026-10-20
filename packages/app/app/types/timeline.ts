import type { ProvenanceNode } from "@brrr/lib";

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

// How a mark is drawn against the focus: the item itself, part of the chain the user picked,
// something else while a chain is picked, or nothing special.
export enum MarkState {
	NORMAL = "NORMAL",
	FOCUSED = "FOCUSED",
	LIT = "LIT",
	DIMMED = "DIMMED",
}

// How a mark or an arc counts on the form's timeline: on the form, or there for context (a lot
// closed in another year, a position still open, a broker lot the lot matching doesn't use).
export enum TimelineWeight {
	REPORTED = "REPORTED",
	CONTEXT = "CONTEXT",
}

export enum TickGranularity {
	YEAR = "YEAR",
	MONTH = "MONTH",
	DAY = "DAY",
}

export type TimelineMark = {
	node: ProvenanceNode;
	kind: TimelineMarkKind;
	// Epoch milliseconds, UTC midnight
	at: number;
	weight: TimelineWeight;
};

// A row of the timeline: a matched lot from the trade that opened it to the one that closed it (a
// buy, then its sale; for a written option, the sale, then the buy), or what is left of a trade
// that no lot closed, running to the end of the axis.
export type TimelineBar = {
	// The matched lot; null for what is still open
	lot: ProvenanceNode | null;
	opened: TimelineMark;
	closed: TimelineMark | null;
	quantity: number;
	weight: TimelineWeight;
};

// What a row of the timeline holds: one bar of its own, or, while the rows are folded, the lots
// closed in other years or what is still open, each group on one row.
export enum TimelineRowKind {
	BAR = "BAR",
	OTHER_YEARS = "OTHER_YEARS",
	STILL_OPEN = "STILL_OPEN",
}

export type TimelineRow = {
	kind: TimelineRowKind;
	// One bar for a bar's own row; a group's bars in the order they opened.
	bars: TimelineBar[];
};

// A mark that ends no bar (a corporate action, a dividend, a tax, a broker lot), on the row under
// the bars. 0 is on that row; points of the same day stack downward.
export type TimelinePoint = {
	mark: TimelineMark;
	stack: number;
};

// Epoch milliseconds, UTC midnight.
export type TimeSpan = {
	from: number;
	to: number;
};

export type TimelineTick = {
	// Epoch milliseconds, UTC midnight
	at: number;
	granularity: TickGranularity;
};

export type Timeline = {
	// Every mark, in date order
	marks: TimelineMark[];
	// Top to bottom, by the day each opened
	bars: TimelineBar[];
	points: TimelinePoint[];
	// Epoch milliseconds of the earliest and the latest mark; 0 and 0 with no marks
	first: number;
	last: number;
	// How many points stack on the busiest day; 0 with no points
	stackDepth: number;
};

export type Point = { x: number; y: number };
