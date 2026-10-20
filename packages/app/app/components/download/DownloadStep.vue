<script setup lang="ts">
import { ProvenanceReportReader, ProvenanceWalker } from "@brrr/lib";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { computed } from "vue";
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
const panel = useInstrumentPanel(() => reading.value);
const { sections, selected, selectedEntry, startAt, cardKey, select } = panel;

const problems = provideReportProblems({
	sections: () => sections.value,
	reading: () => reading.value,
	walker: () => walker.value,
	formCode: () => props.form.code,
	payers: () => payers.value,
	show: panel.show,
});
// Without problems there is no Problems tab, and the instruments are all the column shows.
const tab = computed(() =>
	problems.hasProblems.value ? problems.tab.value : ReportPanelTab.INSTRUMENTS,
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
            <AppBadge>{{ panel.entryCount.value }}</AppBadge>
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
