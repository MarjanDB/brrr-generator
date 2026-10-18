<script setup lang="ts">
import type {
	ProvenanceGraph,
	ProvenanceWalker,
	ReportInstrumentKind,
	ReportProvenance,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import GraphCanvas from "~/components/download/graph/GraphCanvas.vue";
import GraphToolbar from "~/components/download/graph/GraphToolbar.vue";
import { popoverContentOf } from "~/download/graph/view/popoverContentOf";

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
}>();

const { t } = useI18n();

const focus = useGraphFocus();
const {
	showEveryStep,
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
} = useProvenanceGraph({ graph: () => props.graph, reading: () => props.reading });

const captionContext = computed(() => ({
	ticker: props.ticker,
	lotMatchingMethod: props.lotMatchingMethod,
	locale: props.locale,
}));
const popoverContent = computed(() =>
	popover.value === null ? null : popoverContentOf(popover.value.node, props.walker),
);
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
      :popover="popoverContent"
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
