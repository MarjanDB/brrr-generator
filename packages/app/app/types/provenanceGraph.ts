import type {
	ProvenanceChange,
	ProvenanceDrop,
	ProvenanceEventKind,
	ProvenanceNode,
	ProvenanceWarning,
	ReportLeftOut,
} from "@brrr/lib";
import { z } from "zod/v4";

// Mirrors lib's Nominal: the same idea, kept here because the app never builds lib's own ids.
export type Nominal<Value, Brand extends string> = Value & { readonly __brand: Brand };

// A node of the visible graph: a recorded node's id, or "pair:<lot id>" for a matched-lot card.
export type GraphNodeKey = Nominal<string, "Download.GraphNodeKey">;
export const GraphNodeKey = {
	Schema: z.string().transform((value) => value as GraphNodeKey),
};

// A folded stack: the node it hangs on, which side, and what kind its members are.
export type StackKey = Nominal<string, "Download.StackKey">;
export const StackKey = {
	Schema: z.string().transform((value) => value as StackKey),
	of(owner: GraphNodeKey, direction: GraphDirection, kind: GraphNodeKind): StackKey {
		return StackKey.Schema.parse(`${owner}:${direction}:${kind}`);
	},
};

// Which side of a node something hangs on: UP is towards the broker export, DOWN towards the report.
export enum GraphDirection {
	UP = "UP",
	DOWN = "DOWN",
}

export enum GraphLane {
	ACQUIRED = "ACQUIRED",
	MIDDLE = "MIDDLE",
	SOLD = "SOLD",
}

// Every kind a visible node can have. The instrument kinds (GROUPING, STAGING_GROUPING) are
// context and have none.
export enum GraphNodeKind {
	FILE = "FILE",
	ROW = "ROW",
	RECORD = "RECORD",
	STAGING_EVENT = "STAGING_EVENT",
	STAGING_LOT = "STAGING_LOT",
	STAGING_CORPORATE_ACTION = "STAGING_CORPORATE_ACTION",
	EVENT = "EVENT",
	LOT = "LOT",
	CORPORATE_ACTION = "CORPORATE_ACTION",
	MATCHED_LOT = "MATCHED_LOT",
	SUM = "SUM",
	LEG = "LEG",
	REPORT_LINE = "REPORT_LINE",
	PAIR = "PAIR",
	DROP = "DROP",
	STACK = "STACK",
}

// The columns a graph can have, left to right. They are two apart: a node rebuilt from one of its
// own stage (a trade after a split) takes the stage + 1.
export enum GraphStage {
	EXPORT = 0,
	ROW = 2,
	RECORD = 4,
	STAGING = 6,
	CORE = 8,
	MATCHED = 10,
	LEG = 12,
	REPORT = 14,
	DROP = 16,
}

// The names a column can carry. The view maps each to its text.
export enum GraphHeading {
	EXPORT = "EXPORT",
	ROW = "ROW",
	PARSED = "PARSED",
	STAGING = "STAGING",
	TRADE = "TRADE",
	DIVIDEND = "DIVIDEND",
	TAX = "TAX",
	BROKER_LOT = "BROKER_LOT",
	CORPORATE_ACTION = "CORPORATE_ACTION",
	AFTER_CORPORATE_ACTION = "AFTER_CORPORATE_ACTION",
	MATCHED = "MATCHED",
	SUMMED_PER_ACTION = "SUMMED_PER_ACTION",
	SUMMED_PER_DAY = "SUMMED_PER_DAY",
	LEG = "LEG",
	REPORT = "REPORT",
	REPORT_PAIRS = "REPORT_PAIRS",
	LEFT_OUT = "LEFT_OUT",
	// In a trade's graph: the trade each lot was matched with.
	OTHER_SIDE = "OTHER_SIDE",
}

export enum CaptionSegmentKind {
	FOCUS = "FOCUS",
	SPLIT_INTO = "SPLIT_INTO",
	MATCHED_WITH = "MATCHED_WITH",
	REPORT_LINES = "REPORT_LINES",
	SUMMED_INTO = "SUMMED_INTO",
	BOUGHT_AND_SOLD = "BOUGHT_AND_SOLD",
	ADJUSTED = "ADJUSTED",
	LEFT_OUT = "LEFT_OUT",
}

export enum SplitFactorKind {
	MULTIPLY = "MULTIPLY",
	DIVIDE = "DIVIDE",
}

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

// Which line of a pair card was picked.
export enum PairSide {
	ACQUIRED = "ACQUIRED",
	SOLD = "SOLD",
}

// What a split did to a quantity: 4 before, 40 after is ×10; 10 before, 1 after is ÷10.
// The view formats it.
export type SplitFactor = {
	kind: SplitFactorKind;
	amount: number;
};

// One side of a pair card: the leg and the report line it became (none when it was left out).
export type GraphPairSide = {
	leg: ProvenanceNode;
	line: ProvenanceNode | null;
};

// A matched lot and the two report lines it became, drawn as one card.
export type GraphPair = {
	key: GraphNodeKey;
	lot: ProvenanceNode;
	acquired: GraphPairSide;
	sold: GraphPairSide;
	// Both sides', one per distinct reason and detail.
	leftOut: ReportLeftOut[];
};

// The faded neighbours of one kind that hang on one node, folded into a single card.
export type GraphStack = {
	key: StackKey;
	owner: GraphNode;
	direction: GraphDirection;
	memberKind: GraphNodeKind;
	members: GraphNode[];
};

// One node of the visible graph. Which of source, pair, drop and stack is set follows from its kind:
// a PAIR has its pair and the lot as source, a DROP its drop and the node the drop is on as source,
// a STACK (made by the layout) its stack, anything else its source.
export type GraphNode = {
	key: GraphNodeKey;
	kind: GraphNodeKind;
	source: ProvenanceNode | null;
	pair: GraphPair | null;
	drop: ProvenanceDrop | null;
	stack: GraphStack | null;
	warnings: ProvenanceWarning[];
};

// One edge of the visible graph: what the hidden steps between two visible nodes folded into.
export type GraphModelEdge = {
	from: GraphNode;
	to: GraphNode;
	// The change of the first recorded edge on the folded path. Null for an edge to a left-out
	// node: no stage recorded that one.
	change: ProvenanceChange | null;
	// Set when a SPLIT edge joins a trade and the one rebuilt from it.
	split: SplitFactor | null;
};

// The visible graph for one mode (every step, or only the steps that matter). The maps are filled
// when it is built; read them through the lookups in utils/graphModel.ts.
export type GraphModel = {
	// In graph order, then the left-out nodes.
	nodes: GraphNode[];
	edges: GraphModelEdge[];
	// Empty in the every-step view.
	pairs: GraphPair[];
	nodeBySource: Map<ProvenanceNode, GraphNode>;
	lanes: Map<GraphNode, GraphLane>;
	rebuilt: Set<GraphNode>;
	incoming: Map<GraphNode, GraphModelEdge[]>;
	outgoing: Map<GraphNode, GraphModelEdge[]>;
};

// One column of the layout. Only the stages in use get one.
export type GraphColumn = {
	index: number;
	// Distinct, in the order first seen. The view maps each to its text.
	headings: GraphHeading[];
};

// A node of the model as the layout draws it.
export type GraphLayoutNode = {
	// A stack node has kind STACK and its stack set.
	node: GraphNode;
	// Faded: off the main path.
	isStub: boolean;
	// For a stub or a stack: which side of the node it hangs on.
	direction: GraphDirection | null;
	// A stub whose own branch goes on, drawn with a mark for it.
	hasMore: boolean;
	column: number;
	lane: GraphLane;
	// Position inside its column and lane, top to bottom; in a graph without bands, inside its column,
	// or inside its row when it has one.
	order: number;
	// In a trade's graph: the row of the lot it belongs to (the lot, the trade on the other side, why
	// it was left out), top to bottom. Null for everything else.
	row: number | null;
};

export type GraphLayoutEdge = {
	from: GraphLayoutNode;
	to: GraphLayoutNode;
	// Dashed, faint and not clickable.
	isStub: boolean;
	// Null for an edge to a left-out node.
	change: ProvenanceChange | null;
	split: SplitFactor | null;
};

// What the graph shows for one focus: the main path, the faded stubs and stacks around it, and
// where each sits (column, lane, order). The maps are filled by layoutGraph; read them through
// layoutNodeOf and layoutNodeFor in utils/graphLayout.ts.
export type GraphLayout = {
	focus: GraphLayoutNode;
	nodes: GraphLayoutNode[];
	edges: GraphLayoutEdge[];
	// Only the stages in use, left to right.
	columns: GraphColumn[];
	// The lanes with at least one node, top to bottom.
	lanes: GraphLane[];
	// Whether the lanes are drawn as bands. A trade's graph has none: its lots are rows instead.
	banded: boolean;
	byNode: Map<GraphNode, GraphLayoutNode>;
	bySource: Map<ProvenanceNode, GraphLayoutNode>;
};

export type GraphPoint = { x: number; y: number };

export type PlacedNode = {
	layoutNode: GraphLayoutNode;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type PlacedEdge = {
	edge: GraphLayoutEdge;
	from: GraphPoint;
	to: GraphPoint;
	// An SVG path: a cubic curve from one anchor to the other.
	path: string;
	// Where the split badge goes; null for an edge that is not a split.
	badge: GraphPoint | null;
};

// A lane, drawn as a band across the whole graph.
export type PlacedBand = {
	lane: GraphLane;
	y: number;
	height: number;
};

export type PlacedHeading = {
	column: GraphColumn;
	x: number;
};

// A layout in pixels. Read the node map through placedNodeOf in utils/graphLayout.ts.
export type GraphPlacement = {
	width: number;
	height: number;
	nodes: PlacedNode[];
	edges: PlacedEdge[];
	bands: PlacedBand[];
	headings: PlacedHeading[];
	byLayoutNode: Map<GraphLayoutNode, PlacedNode>;
};

// What lights up when a node or an edge is clicked: everything on the path through it, and nothing
// faded.
export type GraphChain = {
	nodes: ReadonlySet<GraphLayoutNode>;
	edges: ReadonlySet<GraphLayoutEdge>;
	// Every recorded node the chain stands for: a pair brings its matched lot, both legs and both
	// lines. The timeline lights its events from this.
	sources: ReadonlySet<ProvenanceNode>;
};

// One part of the line above the graph. The view writes the sentence from i18n.
export type CaptionSegment = {
	kind: CaptionSegmentKind;
	// The node it names: its icon and value.
	node: GraphLayoutNode | null;
	count: number | null;
	// For MATCHED_WITH: the kind it was matched with (ACQUIRED when the focus sold).
	opposite: ProvenanceEventKind | null;
	// For LEFT_OUT: why.
	drop: ProvenanceDrop | null;
};

// The sizes the placement works from. The defaults are the sketch's numbers; the view may tune them.
export type GraphMetrics = {
	nodeWidth: number;
	nodeHeight: number;
	// A pair card is its header plus two rows tall: the buy line and the sell line.
	pairHeaderHeight: number;
	pairRowHeight: number;
	columnGap: number;
	rowGap: number;
	bandGap: number;
	left: number;
	top: number;
};

// What a node says, by kind; each kind has its own i18n text and params (`nodeValueKeys`).
export enum NodeValueKind {
	// A file name or a broker row's own label: { text }.
	TEXT = "TEXT",
	// { quantity, price, currency }
	TRADE = "TRADE",
	// { amount, currency }
	CASH = "CASH",
	// { quantity, date }
	LOT = "LOT",
	// { before, after }
	SPLIT = "SPLIT",
	REVERSE_SPLIT = "REVERSE_SPLIT",
	// { from, to }
	RENAME = "RENAME",
	// { quantity }
	MATCHED = "MATCHED",
	// { date, amount }
	SUM = "SUM",
	// { quantity, date }
	LINE_BOUGHT = "LINE_BOUGHT",
	LINE_SOLD = "LINE_SOLD",
	// { date, amount }
	LINE_DIVIDEND = "LINE_DIVIDEND",
	// A line with none of the known fields: { text } is the key of the kind's noun.
	LINE_OTHER = "LINE_OTHER",
	// { count, kind }: kind is the key of the members' noun.
	STACK = "STACK",
	// A step shown only with every step on (a parsed record, a staging object): { kind } is the key
	// of its noun.
	STEP = "STEP",
	// { side, quantity }: side is the key of the leg's side.
	LEG = "LEG",
}
