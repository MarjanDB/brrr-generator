<script setup lang="ts">
import {
	ProvenanceField,
	type ProvenanceNode,
	ProvenanceReportReader,
	ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { DateTime } from "luxon";
import { computed, shallowRef, watch } from "vue";
import DownloadHeader from "~/components/download/DownloadHeader.vue";
import FocusFacts from "~/components/download/FocusFacts.vue";
import type { GeneratedOutputs } from "~/components/download/generatedOutputs";
import InstrumentHeader from "~/components/download/InstrumentHeader.vue";
import InstrumentPanel from "~/components/download/InstrumentPanel.vue";
import InstrumentTimeline from "~/components/download/InstrumentTimeline.vue";
import { findTaxAuthorityGuide } from "~/components/download/taxAuthorityGuides";
import GuideModal from "~/components/guide/GuideModal.vue";
import { fieldOf } from "~/download/fields";
import { leftOutOf, warningsOf } from "~/download/focusItems";
import { FocusState } from "~/download/graph/FocusState";
import { GraphIndex } from "~/download/graph/GraphIndex";
import { chipsOf } from "~/download/labels/instrumentLabels";
import { buildPanel } from "~/download/panel/buildPanel";
import { defaultFocus } from "~/download/panel/defaultFocus";
import { findEntry } from "~/download/panel/findEntry";
import { firstEntry } from "~/download/panel/firstEntry";
import { buildTimeline } from "~/download/timeline/buildTimeline";
import { markKeys } from "~/download/timeline/markKeys";
import type { TimelineMark } from "~/download/timeline/TimelineMark";

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

// The report is read once. The graph index is held for the graph view.
const reading = computed(() => new ProvenanceReportReader().read(props.outputs.provenance));
const walker = computed(() => new ProvenanceWalker(props.outputs.provenance));
const index = computed(() => new GraphIndex(props.outputs.provenance, reading.value));
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
const timeline = computed(() =>
	selected.value === null ? null : buildTimeline(selected.value, walker.value),
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

function describeMark(mark: TimelineMark): string {
	const date = fieldOf(mark.node, ProvenanceField.DATE) ?? fieldOf(mark.node, ProvenanceField.ACQUIRED_DATE);
	const quantity = Number(fieldOf(mark.node, ProvenanceField.QUANTITY));
	return t(markKeys[mark.kind], {
		date:
			date === null
				? ""
				: DateTime.fromISO(date).setLocale(locale.value).toLocaleString(DateTime.DATE_MED),
		quantity: new Intl.NumberFormat(locale.value).format(Math.abs(quantity)),
		amount: new Intl.NumberFormat(locale.value).format(
			Math.abs(Number(fieldOf(mark.node, ProvenanceField.PRICE))),
		),
		currency: fieldOf(mark.node, ProvenanceField.CURRENCY) ?? "",
	});
}

defineExpose({ index });
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
        v-if="selectedEntry !== null && timeline !== null && focusState !== null"
        class="flex flex-col min-w-0 rounded-md border border-edge"
      >
        <InstrumentHeader :entry="selectedEntry" :chips="chipsOf(selectedEntry.instrument)" />
        <div class="px-4">
          <InstrumentTimeline
            :timeline="timeline"
            :focus="focusState.focus"
            :lit="lit"
            :locale="locale"
            :name="timelineName"
            :describe="describeMark"
            @select="focus"
          />
        </div>
        <FocusFacts :node="focusState.focus" :left-out="leftOut" :warnings="warnings" />
      </div>
    </div>
  </div>

  <GuideModal v-if="guide" :name-key="guide.nameKey" :steps="guide.steps" v-model:open="guideOpen" />
</template>
