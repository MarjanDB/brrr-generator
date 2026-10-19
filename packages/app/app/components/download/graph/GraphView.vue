<script setup lang="ts">
import type {
	ProvenanceGraph,
	ProvenanceNode,
	ProvenanceWalker,
	ReportInstrumentKind,
	ReportProvenance,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import GraphCanvas from "~/components/download/graph/GraphCanvas.vue";
import GraphToolbar from "~/components/download/graph/GraphToolbar.vue";

const props = defineProps<{
	graph: ProvenanceGraph;
	reading: ReportProvenance;
	// For the popovers: where a broker row came from.
	walker: ProvenanceWalker;
	instrumentKind: ReportInstrumentKind;
	ticker: string;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
	locale: string;
	// The form the report lines are for, as a popover names it.
	formName: string;
	// What the timeline draws: the only things a click in the graph can make the focus.
	focusable: ReadonlySet<ProvenanceNode>;
}>();

const { t } = useI18n();

const focus = useGraphFocus();
const {
	showEveryStep,
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
} = useProvenanceGraph({
	graph: () => props.graph,
	reading: () => props.reading,
	focusable: () => props.focusable,
});

const captionContext = computed(() => ({
	ticker: props.ticker,
	lotMatchingMethod: props.lotMatchingMethod,
}));
</script>

<template>
  <section :aria-label="t('download_graph_label')" class="border-t border-edge">
    <GraphToolbar
      :segments="caption"
      :context="captionContext"
      :can-go-back="focus.canGoBack.value"
      :show-every-step="showEveryStep"
      @back="focus.back()"
      @toggle-every-step="toggleEveryStep"
    />
    <GraphCanvas
      :layout="layout"
      :placement="placement"
      :lit="focus.lit.value"
      :instrument-kind="instrumentKind"
      :lot-matching-method-key="lotMatchingKeys[lotMatchingMethod]"
      :locale="locale"
      :popover="popover"
      :form-name="formName"
      :walker="walker"
      @click-node="clickNode"
      @click-line="clickLine"
      @spread="spread"
      @activate-edge="activateEdge"
      @clear-light="clearLight"
      @close-popover="closePopover"
    />
  </section>
</template>
