<script setup lang="ts">
import {
	type ProvenanceNode,
	ProvenanceReportReader,
	ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { computed, shallowRef, watch } from "vue";
import DownloadHeader from "~/components/download/DownloadHeader.vue";
import FocusFacts from "~/components/download/FocusFacts.vue";
import InstrumentHeader from "~/components/download/InstrumentHeader.vue";
import InstrumentPanel from "~/components/download/InstrumentPanel.vue";
import InstrumentTimeline from "~/components/download/InstrumentTimeline.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { TaxAuthorityForm } from "~/types/taxYearReports";

// One form's report for the year, in its tab of the reports step.
const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
}>();

const { t, locale } = useI18n();

const guide = computed(() =>
	findTaxAuthorityGuide(props.outputs.authorityId, props.outputs.reportTypeId),
);

// The report is read once.
const reading = computed(() => new ProvenanceReportReader().read(props.outputs.provenance));
const walker = computed(() => new ProvenanceWalker(props.outputs.provenance));
const sections = computed(() => buildPanel(reading.value));

const focus = provideGraphFocus();
const selected = shallowRef<ReportInstrument | null>(
	firstEntry(sections.value)?.instrument ?? null,
);
if (selected.value !== null) {
	focus.start(defaultFocus(selected.value, walker.value));
}

function select(instrument: ReportInstrument) {
	selected.value = instrument;
	focus.start(defaultFocus(instrument, walker.value));
}

// A new report starts again from its first instrument.
watch(sections, (next) => {
	const first = firstEntry(next)?.instrument ?? null;
	selected.value = first;
	if (first !== null) {
		focus.start(defaultFocus(first, walker.value));
	}
});

const selectedEntry = computed(() =>
	selected.value === null ? null : findEntry(sections.value, selected.value),
);
const leftOut = computed(() =>
	selected.value === null || focus.node.value === null
		? []
		: leftOutOf(selected.value, focus.node.value),
);
const warnings = computed(() =>
	selected.value === null || focus.node.value === null
		? []
		: warningsOf(selected.value, focus.node.value),
);
// What the timeline draws, which is all a click in the graph can make the focus.
const focusable = computed(() =>
	selected.value === null
		? new Set<ProvenanceNode>()
		: focusableOf(buildTimeline(selected.value, walker.value)),
);
const timelineName = computed(
	() => selectedEntry.value?.contract?.occSymbol ?? selectedEntry.value?.ticker ?? "",
);
// The form as the graph's popovers name it: the report type's own id.
const formName = computed(() => props.outputs.reportTypeId.toUpperCase());
</script>

<template>
  <div class="flex flex-col gap-4">
    <DownloadHeader
      :outputs="outputs"
      :form="form"
      :reading="reading"
      :sections="sections"
      :guide="guide"
    />

    <p v-if="selected === null" class="app-text-muted">{{ t('download_nothing') }}</p>

    <div v-else class="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <InstrumentPanel :sections="sections" :selected="selected" @select="select" />

      <div
        v-if="selectedEntry !== null && selected !== null && focus.node.value !== null"
        class="flex flex-col min-w-0 rounded-md border border-edge"
      >
        <InstrumentHeader :entry="selectedEntry" :chips="chipsOf(selectedEntry.instrument)" />
        <div class="px-4">
          <InstrumentTimeline
            :instrument="selected"
            :walker="walker"
            :locale="locale"
            :name="timelineName"
            :year="outputs.year"
          />
        </div>
        <LazyGraphView
          v-if="selected !== null"
          :graph="outputs.provenance"
          :reading="reading"
          :walker="walker"
          :instrument-kind="selected.kind"
          :ticker="timelineName"
          :lot-matching-method="outputs.lotMatchingMethod"
          :locale="locale"
          :form-name="formName"
          :focusable="focusable"
        />
        <FocusFacts :left-out="leftOut" :warnings="warnings" />
      </div>
    </div>
  </div>
</template>
