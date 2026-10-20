<script setup lang="ts">
import {
	type ProvenanceNode,
	ProvenanceReportReader,
	ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { computed, ref, shallowRef, watch } from "vue";
import DownloadHeader from "~/components/download/DownloadHeader.vue";
import InstrumentCard from "~/components/download/InstrumentCard.vue";
import InstrumentPanel from "~/components/download/InstrumentPanel.vue";
import ProblemCard from "~/components/download/ProblemCard.vue";
import ProblemList from "~/components/download/ProblemList.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import { ReportPanelTab } from "~/types/reportProblems";
import type { TaxAuthorityForm } from "~/types/taxYearReports";
import { ColorIntent } from "~/types/ui";

// One form's report for the year, in its tab of the reports step.
const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
}>();

const { t } = useI18n();
const { payers } = useReportFlow();

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
// Where the next card's focus starts, when a problem asked to show one of its items.
const startAt = shallowRef<ProvenanceNode | null>(null);
// How many reports the step has shown: a report made again gets cards of its own.
const made = ref(0);

function select(instrument: ReportInstrument) {
	startAt.value = null;
	selected.value = instrument;
}

// A report made again (another year, or a payer defined by hand) keeps the instrument it showed,
// when it has it; else it starts from its first.
watch(sections, (next, previous) => {
	made.value++;
	startAt.value = null;
	const shown = selected.value === null ? null : findEntry(previous, selected.value);
	selected.value =
		(shown === null ? null : sameEntryIn(next, shown)?.instrument) ??
		firstEntry(next)?.instrument ??
		null;
});

const problems = provideReportProblems({
	sections: () => sections.value,
	reading: () => reading.value,
	walker: () => walker.value,
	formCode: () => props.form.code,
	payers: () => payers.value,
	show: (instrument, at) => {
		selected.value = instrument;
		startAt.value = at;
	},
});
// Without problems there is no Problems tab, and the instruments are all the column shows.
const tab = computed(() =>
	problems.hasProblems.value ? problems.tab.value : ReportPanelTab.INSTRUMENTS,
);
const instrumentCount = computed(() => entriesOf(sections.value).length);

const selectedEntry = computed(() =>
	selected.value === null ? null : findEntry(sections.value, selected.value),
);
// Each instrument gets a card of its own, made when it is picked: its timeline is drawn at its own
// height, and its focus starts on its own first item. Node ids are only unique within one report.
const cardKey = computed(() =>
	selected.value === null ? "" : `${made.value}:${selected.value.node.id}`,
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <DownloadHeader
      :outputs="outputs"
      :form="form"
      :reading="reading"
      :guide="guide"
    />

    <p v-if="selected === null && !problems.hasProblems.value" class="app-text-muted">{{ t('download_nothing') }}</p>

    <div v-else class="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <InstrumentPanel v-if="!problems.hasProblems.value" :sections="sections" :selected="selected" @select="select" />
      <!-- With problems, the column has a tab for them beside the instruments. -->
      <TabsRoot v-else v-model="problems.tab.value" class="flex flex-col gap-2 min-w-0">
        <TabsList :aria-label="t('problems_tabs_label')" :class="tabListClasses">
          <TabsTrigger :value="ReportPanelTab.INSTRUMENTS" :class="tabTriggerClasses">
            {{ t('problems_tab_instruments') }}
            <AppBadge>{{ instrumentCount }}</AppBadge>
          </TabsTrigger>
          <TabsTrigger :value="ReportPanelTab.PROBLEMS" :class="tabTriggerClasses">
            {{ t('problems_tab_problems') }}
            <AppBadge :color="problems.openCount.value > 0 ? ColorIntent.WARNING : ColorIntent.NEUTRAL">
              {{ problems.openCount.value }}
            </AppBadge>
          </TabsTrigger>
        </TabsList>
        <TabsContent :value="ReportPanelTab.INSTRUMENTS" class="app-focus-ring">
          <InstrumentPanel :sections="sections" :selected="selected" @select="select" />
        </TabsContent>
        <TabsContent :value="ReportPanelTab.PROBLEMS" class="app-focus-ring">
          <ProblemList />
        </TabsContent>
      </TabsRoot>

      <ProblemCard v-if="tab === ReportPanelTab.PROBLEMS" />
      <InstrumentCard
        v-else-if="selectedEntry !== null"
        :key="cardKey"
        :entry="selectedEntry"
        :form-code="form.code"
        :outputs="outputs"
        :reading="reading"
        :walker="walker"
        :start-at="startAt"
      />
    </div>
  </div>
</template>
