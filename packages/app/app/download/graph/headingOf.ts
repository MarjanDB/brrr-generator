import { ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { GraphHeading } from "~/download/graph/GraphHeading";
import type { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";

// The name of the column a node stands in. A node rebuilt from one of its own stage says so.
export function headingOf(node: GraphNode, isRebuilt: boolean): GraphHeading {
	switch (node.kind) {
		case GraphNodeKind.FILE:
			return GraphHeading.EXPORT;
		case GraphNodeKind.ROW:
			return GraphHeading.ROW;
		case GraphNodeKind.RECORD:
			return GraphHeading.PARSED;
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return GraphHeading.STAGING;
		case GraphNodeKind.EVENT:
			return isRebuilt ? GraphHeading.AFTER_CORPORATE_ACTION : eventHeading(node);
		case GraphNodeKind.LOT:
			return GraphHeading.BROKER_LOT;
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphHeading.CORPORATE_ACTION;
		case GraphNodeKind.MATCHED_LOT:
			return GraphHeading.MATCHED;
		case GraphNodeKind.SUM:
			return isRebuilt ? GraphHeading.SUMMED_PER_DAY : GraphHeading.SUMMED_PER_ACTION;
		case GraphNodeKind.LEG:
			return GraphHeading.LEG;
		case GraphNodeKind.REPORT_LINE:
			return GraphHeading.REPORT;
		case GraphNodeKind.PAIR:
			return GraphHeading.REPORT_PAIRS;
		case GraphNodeKind.DROP:
			return GraphHeading.LEFT_OUT;
		case GraphNodeKind.STACK:
			throw new Error("A stack is named by its members");
	}
}

function eventHeading(node: GraphNode): GraphHeading {
	switch (node.source?.fields[ProvenanceField.EVENT_KIND]) {
		case ProvenanceEventKind.DIVIDEND:
		case ProvenanceEventKind.PAYMENT_IN_LIEU:
			return GraphHeading.DIVIDEND;
		case ProvenanceEventKind.WITHHOLDING_TAX:
		case ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU:
			return GraphHeading.TAX;
		default:
			return GraphHeading.TRADE;
	}
}
