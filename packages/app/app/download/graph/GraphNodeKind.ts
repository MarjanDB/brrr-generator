import { ProvenanceNodeKind } from "@brrr/lib";

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

const kindOf: Record<ProvenanceNodeKind, GraphNodeKind | null> = {
	[ProvenanceNodeKind.FILE]: GraphNodeKind.FILE,
	[ProvenanceNodeKind.ROW]: GraphNodeKind.ROW,
	[ProvenanceNodeKind.RECORD]: GraphNodeKind.RECORD,
	[ProvenanceNodeKind.STAGING_EVENT]: GraphNodeKind.STAGING_EVENT,
	[ProvenanceNodeKind.STAGING_LOT]: GraphNodeKind.STAGING_LOT,
	[ProvenanceNodeKind.STAGING_GROUPING]: null,
	[ProvenanceNodeKind.STAGING_CORPORATE_ACTION]: GraphNodeKind.STAGING_CORPORATE_ACTION,
	[ProvenanceNodeKind.EVENT]: GraphNodeKind.EVENT,
	[ProvenanceNodeKind.GROUPING]: null,
	[ProvenanceNodeKind.CORPORATE_ACTION]: GraphNodeKind.CORPORATE_ACTION,
	[ProvenanceNodeKind.LOT]: GraphNodeKind.LOT,
	[ProvenanceNodeKind.MATCHED_LOT]: GraphNodeKind.MATCHED_LOT,
	[ProvenanceNodeKind.LEG]: GraphNodeKind.LEG,
	[ProvenanceNodeKind.SUM]: GraphNodeKind.SUM,
	[ProvenanceNodeKind.REPORT_LINE]: GraphNodeKind.REPORT_LINE,
};

export function graphNodeKindOf(kind: ProvenanceNodeKind): GraphNodeKind | null {
	return kindOf[kind];
}

// Steps the reader doesn't need to see unless asked: they fold into the edges around them.
export function isHiddenStep(kind: GraphNodeKind): boolean {
	return (
		kind === GraphNodeKind.RECORD ||
		kind === GraphNodeKind.STAGING_EVENT ||
		kind === GraphNodeKind.STAGING_LOT ||
		kind === GraphNodeKind.STAGING_CORPORATE_ACTION ||
		kind === GraphNodeKind.LEG
	);
}
