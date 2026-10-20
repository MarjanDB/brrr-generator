<script setup lang="ts">
import { type ProvenanceWalker, ReportInstrumentKind, type ReportProvenance } from "@brrr/lib";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { computed } from "vue";
import DetectedTable from "~/components/download/DetectedTable.vue";
import FocusFacts from "~/components/download/FocusFacts.vue";
import InstrumentHeader from "~/components/download/InstrumentHeader.vue";
import InstrumentTimeline from "~/components/download/InstrumentTimeline.vue";
import OnTheFormTable from "~/components/download/OnTheFormTable.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import { InstrumentCardTab } from "~/types/instrumentCard";
import type { PanelEntry } from "~/types/instrumentPanel";

// One instrument's card in a form's tab: its header and timeline, and under them the tabs: what is
// on the form, everything detected, and the trace of the focused item (its facts and provenance
// graph), all reading the card it provides. Keyed by its instrument where it is used, so it is made
// once per instrument and never sees another one's props.
const props = defineProps<{
	entry: PanelEntry;
	outputs: GeneratedOutputs;
	reading: ReportProvenance;
	walker: ProvenanceWalker;
	// The form's own name: Doh-KDVP, Doh-Div, D-IFI.
	formCode: string;
}>();

const { t } = useI18n();
const card = provideInstrumentCard({
	entry: props.entry,
	reading: props.reading,
	walker: props.walker,
	graph: props.outputs.provenance,
	year: props.outputs.year,
	lotMatchingMethod: props.outputs.lotMatchingMethod,
	// The report type's own id.
	formName: props.outputs.reportTypeId.toUpperCase(),
	formCode: props.formCode,
});
const { tab, focus, formLots, formPayments, detected, describeNode } = card;

const onTheForm = computed(() =>
	card.entry.kind === ReportInstrumentKind.DIVIDEND_PAYER
		? formPayments.value.length
		: formLots.value.length,
);
// The Trace tab names what it traces: the focus, which it follows.
const traced = computed(() => (focus.node.value === null ? "" : describeNode(focus.node.value)));
</script>

<template>
  <div class="flex flex-col min-w-0 rounded-md border border-edge">
    <InstrumentHeader />
    <div class="px-4">
      <InstrumentTimeline />
    </div>
    <TabsRoot v-model="tab" class="flex flex-col">
      <TabsList :aria-label="t('download_tabs_label', { name: card.name })" :class="[tabListClasses, 'px-2']">
        <TabsTrigger :value="InstrumentCardTab.ON_THE_FORM" :class="tabTriggerClasses">
          {{ t('download_tab_on_the_form') }}
          <AppBadge>{{ onTheForm }}</AppBadge>
        </TabsTrigger>
        <TabsTrigger :value="InstrumentCardTab.DETECTED" :class="tabTriggerClasses">
          {{ t('download_tab_detected') }}
          <AppBadge>{{ detected.length }}</AppBadge>
        </TabsTrigger>
        <TabsTrigger :value="InstrumentCardTab.TRACE" :class="tabTriggerClasses">
          {{ t('download_tab_trace') }}
          <span v-if="traced !== ''" class="max-w-64 truncate font-normal text-ink-muted">· {{ traced }}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent :value="InstrumentCardTab.ON_THE_FORM" class="py-2 app-focus-ring">
        <OnTheFormTable />
      </TabsContent>
      <TabsContent :value="InstrumentCardTab.DETECTED" class="py-2 app-focus-ring">
        <DetectedTable />
      </TabsContent>
      <TabsContent :value="InstrumentCardTab.TRACE" class="app-focus-ring">
        <FocusFacts />
        <LazyGraphView />
      </TabsContent>
    </TabsRoot>
  </div>
</template>
