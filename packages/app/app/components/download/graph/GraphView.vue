<script setup lang="ts">
import type {
	ProvenanceGraph,
	ProvenanceWalker,
	ReportInstrumentKind,
	ReportProvenance,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { useEventListener } from "@vueuse/core";
import { computed, ref, shallowRef, watch } from "vue";
import GraphCanvas from "~/components/download/graph/GraphCanvas.vue";
import GraphToolbar from "~/components/download/graph/GraphToolbar.vue";
import type { FocusState } from "~/download/graph/FocusState";
import { interact, remapForModel } from "~/download/graph/view/graphInteraction";
import { InteractionKind } from "~/download/graph/view/InteractionKind";
import type { PopoverContent } from "~/download/graph/view/PopoverContent";
import { popoverContentOf } from "~/download/graph/view/popoverContentOf";
import type { GraphLayoutEdge, GraphLayoutNode, PairSide, StackKey } from "~/types/provenanceGraph";

const props = defineProps<{
	graph: ProvenanceGraph;
	reading: ReportProvenance;
	// For the popovers: where a broker row came from.
	walker: ProvenanceWalker;
	focusState: FocusState;
	instrumentKind: ReportInstrumentKind;
	ticker: string;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
	locale: string;
	// The form the report lines are for, as a popover names it.
	formName: string;
}>();

const emit = defineEmits<{
	"update:focusState": [focusState: FocusState];
}>();

const { t } = useI18n();

type OpenPopover = { content: PopoverContent; anchor: GraphLayoutNode };

const showEveryStep = ref(false);
const expanded = shallowRef<ReadonlySet<StackKey>>(new Set());
const popover = shallowRef<OpenPopover | null>(null);

// The layout depends on the focus alone: lighting a chain must not draw the graph again, or the
// chain would point at nodes that no longer exist.
const focus = computed(() => props.focusState.focus);
// One model per mode, each built the first time it is read.
const foldedModel = computed(() => graphModelOf(props.graph, props.reading, false));
const everyStepModel = computed(() => graphModelOf(props.graph, props.reading, true));
const model = computed(() => (showEveryStep.value ? everyStepModel.value : foldedModel.value));
const layout = computed(() =>
	layoutGraph(model.value, { focus: focus.value, expanded: expanded.value }),
);
const placement = computed(() => placeGraph(layout.value, defaultGraphMetrics));
const caption = computed(() => captionOf(layout.value));
const captionContext = computed(() => ({
	ticker: props.ticker,
	lotMatchingMethod: props.lotMatchingMethod,
	locale: props.locale,
}));

// A new focus starts from the folded graph with nothing open.
watch(focus, () => {
	expanded.value = new Set();
	popover.value = null;
});

function run(
	kind: InteractionKind,
	node: GraphLayoutNode | null,
	edge: GraphLayoutEdge | null,
	side: PairSide | null,
) {
	const result = interact({
		layout: layout.value,
		focusState: props.focusState,
		expanded: expanded.value,
		kind,
		node,
		edge,
		side,
	});
	expanded.value = result.expanded;
	const content = result.popoverNode === null ? null : popoverContentOf(result.popoverNode, props.walker);
	popover.value = content === null || node === null ? null : { content, anchor: node };
	emit("update:focusState", result.focusState);
}

function activateNode(node: GraphLayoutNode) {
	run(InteractionKind.NODE, node, null, null);
}

function refocusNode(node: GraphLayoutNode) {
	run(InteractionKind.STUB, node, null, null);
}

function activateLine(node: GraphLayoutNode, side: PairSide) {
	run(InteractionKind.PAIR_ROW, node, null, side);
}

function spread(node: GraphLayoutNode) {
	run(InteractionKind.STACK, node, null, null);
}

function activateEdge(edge: GraphLayoutEdge) {
	run(InteractionKind.EDGE, null, edge, null);
}

function clearLight() {
	run(InteractionKind.BACKGROUND, null, null, null);
}

function toggleEveryStep() {
	const next = !showEveryStep.value;
	// The new mode may hide the focused step, so the focus is moved first, in the same tick.
	emit("update:focusState", remapForModel(props.focusState, next ? everyStepModel.value : foldedModel.value));
	showEveryStep.value = next;
	expanded.value = new Set();
	popover.value = null;
}

useEventListener(document, "keydown", (event: KeyboardEvent) => {
	if (event.key === "Escape") {
		run(InteractionKind.ESCAPE, null, null, null);
	}
});
</script>

<template>
  <section :aria-label="t('download_graph_label')" class="border-t border-edge">
    <GraphToolbar
      :segments="caption"
      :context="captionContext"
      :can-go-back="focusState.canGoBack()"
      :show-every-step="showEveryStep"
      @back="emit('update:focusState', focusState.back())"
      @toggle-every-step="toggleEveryStep"
    />
    <GraphCanvas
      :layout="layout"
      :placement="placement"
      :lit="focusState.lit"
      :instrument-kind="instrumentKind"
      :lot-matching-method-key="lotMatchingKeys[lotMatchingMethod]"
      :locale="locale"
      :popover="popover?.content ?? null"
      :popover-anchor="popover?.anchor ?? null"
      :form-name="formName"
      @activate-node="activateNode"
      @refocus-node="refocusNode"
      @activate-line="activateLine"
      @spread="spread"
      @activate-edge="activateEdge"
      @clear-light="clearLight"
    />
  </section>
</template>
