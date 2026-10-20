<script setup lang="ts">
import { ProvenanceReportReader, ProvenanceWalker, type ReportInstrument } from "@brrr/lib";
import { computed, shallowRef, watch } from "vue";
import DownloadHeader from "~/components/download/DownloadHeader.vue";
import InstrumentCard from "~/components/download/InstrumentCard.vue";
import InstrumentPanel from "~/components/download/InstrumentPanel.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { TaxAuthorityForm } from "~/types/taxYearReports";

// One form's report for the year, in its tab of the reports step.
const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
}>();

const { t } = useI18n();

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

function select(instrument: ReportInstrument) {
	selected.value = instrument;
}

// A new report starts again from its first instrument.
watch(sections, (next) => {
	selected.value = firstEntry(next)?.instrument ?? null;
});

const selectedEntry = computed(() =>
	selected.value === null ? null : findEntry(sections.value, selected.value),
);
// Each instrument gets a card of its own, made when it is picked: its timeline is drawn at its own
// height, and its focus starts on its own first item. Node ids are only unique within one report.
const cardKey = computed(() =>
	selected.value === null ? "" : `${props.outputs.year}:${selected.value.node.id}`,
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <DownloadHeader
      :outputs="outputs"
      :form="form"
      :reading="reading"
      :sections="sections"
      :guide="guide"
      @select="select"
    />

    <p v-if="selected === null" class="app-text-muted">{{ t('download_nothing') }}</p>

    <div v-else class="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <InstrumentPanel :sections="sections" :selected="selected" @select="select" />

      <InstrumentCard
        v-if="selectedEntry !== null"
        :key="cardKey"
        :entry="selectedEntry"
        :form-code="form.code"
        :outputs="outputs"
        :reading="reading"
        :walker="walker"
      />
    </div>
  </div>
</template>
