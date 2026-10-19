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
	// 0 is on the axis; marks of the same day stack downward
	stack: number;
	weight: TimelineWeight;
};

// A matched lot, drawn from the buy it took to the sale it filled.
export type TimelineArc = {
	lot: ProvenanceNode;
	from: TimelineMark;
	to: TimelineMark;
	quantity: number;
	weight: TimelineWeight;
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
	marks: TimelineMark[];
	arcs: TimelineArc[];
	// Epoch milliseconds of the earliest and the latest mark; 0 and 0 with no marks
	first: number;
	last: number;
	stackDepth: number;
};

export type Point = { x: number; y: number };

// A quadratic curve: where it starts, where it ends, and the point that bends it.
export type ArcGeometry = {
	start: Point;
	end: Point;
	control: Point;
};
