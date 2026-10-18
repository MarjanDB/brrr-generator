import type { ProvenanceGraph, ReportProvenance } from "@brrr/lib";
import { useEventListener } from "@vueuse/core";
import {
	type GraphLayoutEdge,
	type GraphLayoutNode,
	type GraphNode,
	GraphNodeKey,
	GraphNodeKind,
	PairSide,
	type StackKey,
} from "~/types/provenanceGraph";

export type ProvenanceGraphArgs = {
	graph: () => ProvenanceGraph;
	reading: () => ReportProvenance;
};

// The open popover: the node it is about and the drawn node it hangs on.
export type OpenPopover = { node: GraphNode; anchor: GraphLayoutNode };

// Only a broker row and a report line have a popover.
function hasPopover(node: GraphNode): boolean {
	return node.kind === GraphNodeKind.ROW || node.kind === GraphNodeKind.REPORT_LINE;
}

// The line on one side of a pair, as a node of its own, so a popover can be opened for it.
function lineNodeOf(node: GraphNode, side: PairSide): GraphNode | null {
	const line = side === PairSide.ACQUIRED ? node.pair?.acquired.line : node.pair?.sold.line;
	if (line === null || line === undefined) {
		return null;
	}
	return {
		key: GraphNodeKey.Schema.parse(`${node.key}:${side}`),
		kind: GraphNodeKind.REPORT_LINE,
		source: line,
		pair: null,
		drop: null,
		stack: null,
		warnings: [],
	};
}

// The provenance graph around the focused node, and what a click in it does. Needs an ancestor
// that called provideGraphFocus. A click on a node lights its chain and keeps the focus; only a
// stub moves the focus, and then the spread stacks fold again.
export function useProvenanceGraph(args: ProvenanceGraphArgs) {
	const focus = useGraphFocus();

	const showEveryStep = ref(false);
	const expanded = shallowRef<ReadonlySet<StackKey>>(new Set());
	const popover = shallowRef<OpenPopover | null>(null);

	// One model per mode, each built the first time it is read.
	const foldedModel = computed(() => graphModelOf(args.graph(), args.reading(), false));
	const everyStepModel = computed(() => graphModelOf(args.graph(), args.reading(), true));
	const model = computed(() => (showEveryStep.value ? everyStepModel.value : foldedModel.value));
	// The layout depends on the focus node and the spread stacks alone: lighting a chain must not
	// draw the graph again, or the chain would point at nodes that no longer exist.
	const layout = computed(() => {
		const node = focus.node.value;
		if (node === null) {
			throw new Error("useProvenanceGraph: the focus was never started");
		}
		return layoutGraph(model.value, { focus: node, expanded: expanded.value });
	});
	const placement = computed(() => placeGraph(layout.value, defaultGraphMetrics));
	const caption = computed(() => captionOf(layout.value));

	// A new focus starts from the folded graph with nothing open.
	watch(focus.node, () => {
		expanded.value = new Set();
		popover.value = null;
	});

	function activateNode(node: GraphLayoutNode) {
		focus.lightNode(layout.value, node);
		popover.value = hasPopover(node.node) ? { node: node.node, anchor: node } : null;
	}

	function refocusNode(node: GraphLayoutNode) {
		const source = node.node.source;
		popover.value = null;
		// A left-out node and a stack are never followed.
		if (node.node.kind === GraphNodeKind.DROP || node.node.stack !== null || source === null) {
			focus.lightNode(layout.value, node);
			return;
		}
		focus.refocus(source);
	}

	function activateLine(node: GraphLayoutNode, side: PairSide) {
		focus.lightNode(layout.value, node);
		const line = lineNodeOf(node.node, side);
		popover.value = line === null ? null : { node: line, anchor: node };
	}

	function spread(node: GraphLayoutNode) {
		// Spreading redraws the graph, so a chain lit in the old drawing is let go.
		focus.clearLight();
		popover.value = null;
		const stack = node.node.stack;
		if (stack !== null) {
			expanded.value = new Set([...expanded.value, stack.key]);
		}
	}

	function activateEdge(edge: GraphLayoutEdge) {
		focus.lightEdge(layout.value, edge);
		popover.value = null;
	}

	function clearLight() {
		focus.clearLight();
		popover.value = null;
	}

	function toggleEveryStep() {
		const next = !showEveryStep.value;
		const nextModel = next ? everyStepModel.value : foldedModel.value;
		// The new mode may hide the focused step, so the focus is moved first, in the same tick.
		focus.remap((source) => modelNodeFor(nextModel, source).source ?? source);
		showEveryStep.value = next;
		expanded.value = new Set();
		popover.value = null;
	}

	useEventListener(document, "keydown", (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			clearLight();
		}
	});

	return {
		showEveryStep,
		model,
		layout,
		placement,
		caption,
		popover,
		activateNode,
		refocusNode,
		activateLine,
		spread,
		activateEdge,
		clearLight,
		toggleEveryStep,
	};
}
