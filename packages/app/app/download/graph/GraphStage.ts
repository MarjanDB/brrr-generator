import { GraphNodeKind } from "~/download/graph/GraphNodeKind";

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

export function stageOf(kind: GraphNodeKind): GraphStage {
	switch (kind) {
		case GraphNodeKind.FILE:
			return GraphStage.EXPORT;
		case GraphNodeKind.ROW:
			return GraphStage.ROW;
		case GraphNodeKind.RECORD:
			return GraphStage.RECORD;
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return GraphStage.STAGING;
		case GraphNodeKind.EVENT:
		case GraphNodeKind.LOT:
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphStage.CORE;
		case GraphNodeKind.MATCHED_LOT:
		case GraphNodeKind.SUM:
			return GraphStage.MATCHED;
		case GraphNodeKind.LEG:
			return GraphStage.LEG;
		case GraphNodeKind.REPORT_LINE:
		case GraphNodeKind.PAIR:
			return GraphStage.REPORT;
		case GraphNodeKind.DROP:
			return GraphStage.DROP;
		case GraphNodeKind.STACK:
			throw new Error("A stack has no stage of its own; ask for its members'");
	}
}
