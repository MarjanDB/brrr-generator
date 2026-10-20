<script setup lang="ts">
import GraphCanvas from "~/components/download/graph/GraphCanvas.vue";
import GraphToolbar from "~/components/download/graph/GraphToolbar.vue";

// The focused item's provenance, under the timeline of the card it is in.
const { t, locale } = useI18n();
const card = useInstrumentCard();
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
	graph: () => card.graph,
	reading: () => card.reading,
	focusable: () => card.focusable.value,
});

const captionContext = computed(() => ({
	ticker: card.name,
	lotMatchingMethod: card.lotMatchingMethod,
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
      :instrument-kind="card.entry.kind"
      :lot-matching-method-key="I18nKeys.lotMatching[card.lotMatchingMethod]"
      :locale="locale"
      :popover="popover"
      :form-name="card.formName"
      :walker="card.walker"
      @click-node="clickNode"
      @click-line="clickLine"
      @spread="spread"
      @activate-edge="activateEdge"
      @clear-light="clearLight"
      @close-popover="closePopover"
    />
  </section>
</template>
