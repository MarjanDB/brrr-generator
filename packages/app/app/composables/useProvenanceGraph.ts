import type { ProvenanceGraph, ProvenanceNode, ReportProvenance } from "@brrr/lib";
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
	// What the timeline draws: the only things a click can make the focus.
	focusable: () => ReadonlySet<ProvenanceNode>;
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
// that called provideGraphFocus. A click on something the timeline draws moves the focus there,
// and then the spread stacks fold again; a click on anything else, or on the focus, lights its
// chain and keeps the focus.
export function useProvenanceGraph(args: ProvenanceGraphArgs) {
	const focus = useGraphFocus();

	const showEveryStep = ref(false);
	const expanded = shallowRef<ReadonlySet<StackKey>>(new Set());
	const popover = shallowRef<OpenPopover | null>(null);

	// One model per mode, each built the first time it is read.
	const foldedModel = computed(() => graphModelOf(args.graph(), args.reading(), false));
	const everyStepModel = computed(() => graphModelOf(args.graph(), args.reading(), true));
	const model = computed(() => (showEveryStep.value ? everyStepModel.value : foldedModel.value));
	// The layout depends on the focus node, the spread stacks and what the timeline draws alone:
	// lighting a chain must not draw the graph again, or the chain would point at nodes that no
	// longer exist.
	const layout = computed(() => {
		const node = focus.node.value;
		if (node === null) {
			throw new Error("useProvenanceGraph: the focus was never started");
		}
		return layoutGraph(model.value, {
			focus: node,
			expanded: expanded.value,
			focusable: args.focusable(),
		});
	});
	const placement = computed(() => placeGraph(layout.value, defaultGraphMetrics));
	const caption = computed(() => captionOf(layout.value));

	// A new focus starts from the folded graph with nothing open.
	watch(focus.node, () => {
		expanded.value = new Set();
		popover.value = null;
	});

	function clickNode(node: GraphLayoutNode) {
		if (node.follow !== null) {
			popover.value = null;
			focus.refocus(node.follow);
			return;
		}
		focus.lightNode(layout.value, node);
		popover.value = hasPopover(node.node) ? { node: node.node, anchor: node } : null;
	}

	// A pair card's rows: a lot that can be followed is followed from either; the focused lot's row
	// lights the lot's chain and opens that line's popover.
	function clickLine(node: GraphLayoutNode, side: PairSide) {
		if (node.follow !== null) {
			popover.value = null;
			focus.refocus(node.follow);
			return;
		}
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

	// A click outside the popover closes it and keeps the chain lit.
	function closePopover() {
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

	// Escape lets go of the lit chain, unless an open popover, dialog or tooltip takes it first:
	// reka-ui marks each open layer with data-dismissable-layer.
	useEventListener(document, "keydown", (event: KeyboardEvent) => {
		if (event.key === "Escape" && document.querySelector("[data-dismissable-layer]") === null) {
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
		clickNode,
		clickLine,
		spread,
		activateEdge,
		clearLight,
		closePopover,
		toggleEveryStep,
	};
}
