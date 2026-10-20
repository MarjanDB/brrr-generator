<script setup lang="ts">
import type { ReportInstrument, ReportProvenance } from "@brrr/lib";
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import { computed, onMounted, onUnmounted, ref } from "vue";
import TaxpayerDialog from "~/components/download/TaxpayerDialog.vue";
import GuideModal from "~/components/guide/GuideModal.vue";
import AppButton from "~/components/ui/AppButton.vue";
import AppPopover from "~/components/ui/AppPopover.vue";
import IssueButton from "~/components/ui/IssueButton.vue";
import { CountNoun } from "~/types/counts";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { PanelSections } from "~/types/instrumentPanel";
import type { TaxAuthorityForm } from "~/types/taxYearReports";
import { ButtonVariant, IssueSeverity } from "~/types/ui";
import type { TaxAuthorityGuide } from "~/utils/taxAuthorityGuides";

const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
	reading: ReportProvenance;
	sections: PanelSections;
	guide: TaxAuthorityGuide | undefined;
}>();

const emit = defineEmits<{
	select: [instrument: ReportInstrument];
}>();

const { t } = useI18n();
const { dropSentence, warningSentence } = useProvenanceText();
const { countText } = useCountText();
const reports = useTaxYearReports();

// The report step's own problems, grouped by cause. What the import left out is the review step's.
const warningItems = computed(() => warningItemsOf(props.sections, props.reading.warnings));
const warningGroups = computed(() => warningGroupsOf(warningItems.value));
const leftOutGroups = computed(() => leftOutGroupsOf(props.reading.needsALook));
const needsALookOpen = ref(false);
const warningsOpen = ref(false);

// A warning names its instrument: a click on it selects that instrument, and closes the list.
function selectFromWarnings(instrument: ReportInstrument) {
	warningsOpen.value = false;
	emit("select", instrument);
}

// A group's heading, folding open to its items; the only group of a list starts open.
const groupTrigger =
	"flex w-full items-center gap-2 px-2 py-1.5 text-left rounded-sm cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-raised app-focus-ring-inset";

// "10 lines on the form, 5 items not on it": what the form holds, and what the import has that it
// doesn't.
const summary = computed(() => {
	const { lines, notInReport } = props.reading.totals;
	const onTheForm = countText(CountNoun.FORM_LINE, lines);
	if (notInReport === 0) {
		return onTheForm;
	}
	return t("download_summary", {
		lines: onTheForm,
		others: countText(CountNoun.ITEM_NOT_ON_FORM, notInReport),
	});
});
const noIssues = computed(
	() => props.reading.totals.needsALook === 0 && warningItems.value.length === 0,
);

const csvUrl = ref<string | null>(null);

onMounted(() => {
	csvUrl.value = URL.createObjectURL(new Blob([props.outputs.csv], { type: "text/csv" }));
});

onUnmounted(() => {
	if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
	csvUrl.value = null;
});

// A form whose XML has no taxpayer block downloads it straight away.
const savingXml = ref(false);
async function downloadXml() {
	savingXml.value = true;
	try {
		await reports.downloadXml(props.outputs, reports.taxpayer.value);
	} finally {
		savingXml.value = false;
	}
}
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <p class="text-body text-ink-muted">{{ summary }}</p>

    <!-- A problem is a button that says what it is and opens its list, grouped by cause. -->
    <AppPopover v-if="reading.totals.needsALook > 0" v-model:open="needsALookOpen" class="w-96">
      <template #trigger>
        <IssueButton :severity="IssueSeverity.DANGER" opens>
          {{ countText(CountNoun.ITEM_NEEDS_A_LOOK, reading.totals.needsALook) }}
        </IssueButton>
      </template>
      <p class="text-label mb-2">{{ t('download_needs_look_title') }}</p>
      <div class="flex flex-col gap-1">
        <CollapsibleRoot
          v-for="(group, index) in leftOutGroups"
          :key="index"
          v-slot="{ open }"
          :default-open="leftOutGroups.length === 1"
        >
          <CollapsibleTrigger :class="groupTrigger">
            <span class="i-mdi-alert-circle-outline shrink-0 text-danger-ink" aria-hidden="true" />
            <span class="flex-1 text-body">{{ dropSentence(group.drop) }}</span>
            <AppBadge>{{ group.items.length }}</AppBadge>
            <span class="shrink-0 text-ink-muted" :class="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul class="flex flex-col pl-8 pb-1">
              <li v-for="(item, itemIndex) in group.items" :key="itemIndex" class="py-1 text-meta">
                {{ item.subject.label }}
              </li>
            </ul>
          </CollapsibleContent>
        </CollapsibleRoot>
      </div>
    </AppPopover>

    <AppPopover v-if="warningItems.length > 0" v-model:open="warningsOpen" class="w-96">
      <template #trigger>
        <IssueButton :severity="IssueSeverity.WARNING" opens>
          {{ countText(CountNoun.WARNING, warningItems.length) }}
        </IssueButton>
      </template>
      <p class="text-label mb-2">{{ t('download_warnings_title') }}</p>
      <div class="flex flex-col gap-1">
        <CollapsibleRoot
          v-for="group in warningGroups"
          :key="group.kind"
          v-slot="{ open }"
          :default-open="warningGroups.length === 1"
        >
          <CollapsibleTrigger :class="groupTrigger">
            <span class="i-mdi-alert-outline shrink-0 text-warning-ink" aria-hidden="true" />
            <span class="flex-1 text-body">{{ t(warningGroupKeys[group.kind]) }}</span>
            <AppBadge>{{ group.items.length }}</AppBadge>
            <span class="shrink-0 text-ink-muted" :class="open ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul class="flex flex-col pl-6 pb-1">
              <li v-for="(item, itemIndex) in group.items" :key="itemIndex">
                <button
                  type="button"
                  class="row-selectable w-full flex flex-col items-start px-2 py-1 text-left rounded-sm app-focus-ring-inset"
                  @click="selectFromWarnings(item.instrument)"
                >
                  <span class="text-label">{{ item.title }}</span>
                  <span class="text-meta">{{ warningSentence(item.warning) }}</span>
                </button>
              </li>
            </ul>
          </CollapsibleContent>
        </CollapsibleRoot>
      </div>
    </AppPopover>

    <p v-if="noIssues" class="inline-flex items-center gap-1.5 text-body text-success-ink">
      <span class="i-mdi-check-circle-outline" aria-hidden="true" />
      {{ t('download_no_issues') }}
    </p>

    <span class="flex-1" />

    <!-- One filled button: the XML is what the tax office imports. -->
    <GuideModal v-if="guide" :name-key="guide.nameKey" :steps="guide.steps">
      <template #trigger>
        <AppButton :variant="ButtonVariant.SECONDARY">
          {{ t('tax_authority_guide_button') }}
        </AppButton>
      </template>
    </GuideModal>
    <a v-if="csvUrl" :href="csvUrl" :download="outputs.csvFilename" class="button-secondary control-md">
      {{ t('download_csv_label') }}
    </a>
    <TaxpayerDialog v-if="form.takesTaxpayer" :outputs="outputs" :form-name="form.code" />
    <AppButton v-else :loading="savingXml" @click="downloadXml">
      {{ t('download_xml_label') }}
    </AppButton>
  </div>
</template>
