import { chainOfEdge, chainOfNode } from "~/download/graph/chain";
import type { FocusState } from "~/download/graph/FocusState";
import { GraphNodeKey, type StackKey } from "~/download/graph/GraphIdentifiers";
import type { GraphLayout } from "~/download/graph/GraphLayout";
import type { GraphLayoutEdge } from "~/download/graph/GraphLayoutEdge";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import type { GraphModel } from "~/download/graph/GraphModel";
import { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { InteractionKind } from "~/download/graph/view/InteractionKind";
import { InteractionResult } from "~/download/graph/view/InteractionResult";
import { PairSide } from "~/download/graph/view/PairSide";

export type InteractionArgs = {
	layout: GraphLayout;
	focusState: FocusState;
	expanded: ReadonlySet<StackKey>;
	kind: InteractionKind;
	// The node clicked, for every kind but EDGE, BACKGROUND and ESCAPE.
	node: GraphLayoutNode | null;
	// The edge clicked, for EDGE.
	edge: GraphLayoutEdge | null;
	// The line of the pair clicked, for PAIR_ROW.
	side: PairSide | null;
};

// Only a broker row and a report line have a popover.
function popoverOf(node: GraphNode): GraphNode | null {
	return node.kind === GraphNodeKind.ROW || node.kind === GraphNodeKind.REPORT_LINE ? node : null;
}

// The line on one side of a pair, as a node of its own, so a popover can be opened for it.
function lineNodeOf(node: GraphNode, side: PairSide): GraphNode | null {
	const line = side === PairSide.ACQUIRED ? node.pair?.acquired.line : node.pair?.sold.line;
	if (line === null || line === undefined) {
		return null;
	}
	return new GraphNode({
		key: GraphNodeKey.Schema.parse(`${node.key}:${side}`),
		kind: GraphNodeKind.REPORT_LINE,
		source: line,
		pair: null,
		drop: null,
		stack: null,
		warnings: [],
	});
}

// The one place that decides what a click does. A click on a node lights its chain and keeps the
// focus; only a stub (or a double-click) moves the focus, and then the spread stacks fold again.
export function interact(args: InteractionArgs): InteractionResult {
	const { layout, focusState, expanded, node, edge } = args;
	const keep = (next: FocusState, popoverNode: GraphNode | null) =>
		new InteractionResult({
			focusState: next,
			expanded: next.focus === focusState.focus ? expanded : new Set(),
			popoverNode,
		});
	switch (args.kind) {
		case InteractionKind.NODE:
			return node === null
				? keep(focusState.clearLight(), null)
				: keep(focusState.light(chainOfNode(layout, node)), popoverOf(node.node));
		case InteractionKind.STUB: {
			if (node === null) {
				return keep(focusState.clearLight(), null);
			}
			// A left-out node and a stack are never followed.
			const source = node.node.source;
			if (node.node.kind === GraphNodeKind.DROP || node.node.stack !== null || source === null) {
				return keep(focusState.light(chainOfNode(layout, node)), null);
			}
			return keep(focusState.refocus(source), null);
		}
		case InteractionKind.STACK: {
			const stack = node?.node.stack;
			// Spreading redraws the graph, so a chain lit in the old drawing is let go.
			return new InteractionResult({
				focusState: focusState.clearLight(),
				expanded:
					stack === null || stack === undefined ? expanded : new Set([...expanded, stack.key]),
				popoverNode: null,
			});
		}
		case InteractionKind.EDGE:
			return edge === null
				? keep(focusState.clearLight(), null)
				: keep(focusState.light(chainOfEdge(layout, edge)), null);
		case InteractionKind.PAIR_ROW:
			return node === null || args.side === null
				? keep(focusState.clearLight(), null)
				: keep(focusState.light(chainOfNode(layout, node)), lineNodeOf(node.node, args.side));
		case InteractionKind.BACKGROUND:
		case InteractionKind.ESCAPE:
			return keep(focusState.clearLight(), null);
	}
}

// The focus and the trail in the other mode's graph: a step that mode hides becomes the visible
// node next to it.
export function remapForModel(focusState: FocusState, next: GraphModel): FocusState {
	return focusState.remap((source) => next.nodeFor(source).source ?? source);
}
