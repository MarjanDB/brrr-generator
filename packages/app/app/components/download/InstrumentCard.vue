<script setup lang="ts">
import type { ProvenanceWalker, ReportProvenance } from "@brrr/lib";
import FocusFacts from "~/components/download/FocusFacts.vue";
import InstrumentHeader from "~/components/download/InstrumentHeader.vue";
import InstrumentTimeline from "~/components/download/InstrumentTimeline.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { PanelEntry } from "~/types/instrumentPanel";

// One instrument's card in a form's tab: its header, timeline, provenance graph and the focused
// item's facts, all reading the card it provides. Keyed by its instrument where it is used, so it
// is made once per instrument and never sees another one's props.
const props = defineProps<{
	entry: PanelEntry;
	outputs: GeneratedOutputs;
	reading: ReportProvenance;
	walker: ProvenanceWalker;
}>();

provideInstrumentCard({
	entry: props.entry,
	reading: props.reading,
	walker: props.walker,
	graph: props.outputs.provenance,
	year: props.outputs.year,
	lotMatchingMethod: props.outputs.lotMatchingMethod,
	// The report type's own id.
	formName: props.outputs.reportTypeId.toUpperCase(),
});
</script>

<template>
  <div class="flex flex-col min-w-0 rounded-md border border-edge">
    <InstrumentHeader />
    <div class="px-4">
      <InstrumentTimeline />
    </div>
    <LazyGraphView />
    <FocusFacts />
  </div>
</template>
