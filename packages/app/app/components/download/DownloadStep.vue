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
import GuideModal from "~/components/guide/GuideModal.vue";
import { FocusState } from "~/download/graph/FocusState";
import type { GeneratedOutputs } from "~/types/generatedOutputs";

const props = defineProps<{
	outputs: GeneratedOutputs;
}>();

const emit = defineEmits<{
	restart: [];
}>();

const { t, locale } = useI18n();

const guideOpen = ref(false);
const guide = computed(() =>
	findTaxAuthorityGuide(props.outputs.authorityId, props.outputs.reportTypeId),
);

// The report is read once.
const reading = computed(() => new ProvenanceReportReader().read(props.outputs.provenance));
const walker = computed(() => new ProvenanceWalker(props.outputs.provenance));
const sections = computed(() => buildPanel(reading.value));

const selected = shallowRef<ReportInstrument | null>(
	firstEntry(sections.value)?.instrument ?? null,
);
const focusState = shallowRef<FocusState | null>(
	selected.value === null ? null : FocusState.start(defaultFocus(selected.value)),
);

function select(instrument: ReportInstrument) {
	selected.value = instrument;
	focusState.value = FocusState.start(defaultFocus(instrument));
}

function focus(node: ProvenanceNode) {
	focusState.value = focusState.value?.refocus(node) ?? null;
}

// A new report starts again from its first instrument.
watch(sections, (next) => {
	const first = firstEntry(next)?.instrument ?? null;
	selected.value = first;
	focusState.value = first === null ? null : FocusState.start(defaultFocus(first));
});

const selectedEntry = computed(() =>
	selected.value === null ? null : findEntry(sections.value, selected.value),
);
const lit = computed(() => focusState.value?.lit?.sources ?? null);
const leftOut = computed(() =>
	selected.value === null || focusState.value === null
		? []
		: leftOutOf(selected.value, focusState.value.focus),
);
const warnings = computed(() =>
	selected.value === null || focusState.value === null
		? []
		: warningsOf(selected.value, focusState.value.focus),
);
const timelineName = computed(
	() => selectedEntry.value?.contract?.occSymbol ?? selectedEntry.value?.ticker ?? "",
);
// The form as the graph's popovers name it: the report type's own id.
const formName = computed(() => props.outputs.reportTypeId.toUpperCase());
</script>

<template>
  <div class="card card-padding-md flex flex-col gap-4">
    <DownloadHeader
      :outputs="outputs"
      :reading="reading"
      :sections="sections"
      :guide="guide"
      @open-guide="guideOpen = true"
      @restart="emit('restart')"
    />

    <p v-if="selected === null" class="app-text-muted">{{ t('download_nothing') }}</p>

    <div v-else class="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <InstrumentPanel :sections="sections" :selected="selected" @select="select" />

      <div
        v-if="selectedEntry !== null && selected !== null && focusState !== null"
        class="flex flex-col min-w-0 rounded-md border border-edge"
      >
        <InstrumentHeader :entry="selectedEntry" :chips="chipsOf(selectedEntry.instrument)" />
        <div class="px-4">
          <InstrumentTimeline
            :instrument="selected"
            :walker="walker"
            :focus="focusState.focus"
            :lit="lit"
            :locale="locale"
            :name="timelineName"
            @select="focus"
          />
        </div>
        <LazyGraphView
          v-if="selected !== null"
          :graph="outputs.provenance"
          :reading="reading"
          :walker="walker"
          :focus-state="focusState"
          :instrument-kind="selected.kind"
          :ticker="timelineName"
          :lot-matching-method="outputs.lotMatchingMethod"
          :locale="locale"
          :form-name="formName"
          @update:focus-state="(next) => (focusState = next)"
        />
        <FocusFacts :node="focusState.focus" :left-out="leftOut" :warnings="warnings" />
      </div>
    </div>
  </div>

  <GuideModal v-if="guide" :name-key="guide.nameKey" :steps="guide.steps" v-model:open="guideOpen" />
</template>
