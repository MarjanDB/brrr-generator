import {
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type ProvenanceWalker,
} from "@brrr/lib";
import { GraphLane } from "~/download/graph/GraphLane";
import { GraphNodeKind, graphNodeKindOf, isHiddenStep } from "~/download/graph/GraphNodeKind";

// The lane of a trade or dividend comes from what it is, never from a label or a sign.
function laneOfEvent(event: ProvenanceNode): GraphLane {
	switch (event.fields[ProvenanceField.EVENT_KIND]) {
		case ProvenanceEventKind.ACQUIRED:
		case ProvenanceEventKind.DIVIDEND:
		case ProvenanceEventKind.PAYMENT_IN_LIEU:
			return GraphLane.ACQUIRED;
		case ProvenanceEventKind.SOLD:
		case ProvenanceEventKind.WITHHOLDING_TAX:
		case ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU:
			return GraphLane.SOLD;
		default:
			return GraphLane.MIDDLE;
	}
}

// The lane of a recorded node (not of a pair, which is in the middle, nor of a left-out node, which
// follows its owner). A row or a hidden step takes the one lane of the trades, lots and corporate
// actions it became, and the middle when it became things from both.
export function laneOfSource(source: ProvenanceNode, walker: ProvenanceWalker): GraphLane {
	const kind = graphNodeKindOf(source.kind);
	switch (kind) {
		case GraphNodeKind.EVENT:
			return laneOfEvent(source);
		case GraphNodeKind.LOT:
		case GraphNodeKind.CORPORATE_ACTION:
			return GraphLane.ACQUIRED;
		case GraphNodeKind.ROW:
		case GraphNodeKind.RECORD:
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return laneOfWhatItBecame(source, walker);
		default:
			return GraphLane.MIDDLE;
	}
}

function laneOfWhatItBecame(source: ProvenanceNode, walker: ProvenanceWalker): GraphLane {
	const lanes = new Set<GraphLane>();
	const seen = new Set<ProvenanceNode>([source]);
	const pending: ProvenanceNode[] = [source];
	for (const current of pending) {
		for (const edge of walker.children(current)) {
			const next = edge.to;
			if (seen.has(next)) {
				continue;
			}
			seen.add(next);
			const nextKind = graphNodeKindOf(next.kind);
			if (
				nextKind === GraphNodeKind.EVENT ||
				nextKind === GraphNodeKind.LOT ||
				nextKind === GraphNodeKind.CORPORATE_ACTION
			) {
				lanes.add(laneOfSource(next, walker));
			} else if (nextKind !== null && isHiddenStep(nextKind)) {
				pending.push(next);
			}
		}
	}
	const [only] = [...lanes];
	return lanes.size === 1 && only !== undefined ? only : GraphLane.MIDDLE;
}
