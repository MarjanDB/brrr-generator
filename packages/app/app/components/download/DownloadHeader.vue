<script setup lang="ts">
import type { ReportProvenance } from "@brrr/lib";
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
import { ButtonVariant, ColorIntent, IssueSeverity } from "~/types/ui";
import type { TaxAuthorityGuide } from "~/utils/taxAuthorityGuides";

const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
	reading: ReportProvenance;
	sections: PanelSections;
	guide: TaxAuthorityGuide | undefined;
}>();

const { t } = useI18n();
const { dropSentence, warningSentence } = useProvenanceText();
const { countText } = useCountText();
const reports = useTaxYearReports();

const warningItems = computed(() => warningItemsOf(props.sections));

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

    <!-- A problem is a button that says what it is and opens the list of them. -->
    <AppPopover v-if="reading.totals.needsALook > 0" class="w-96">
      <template #trigger>
        <IssueButton :severity="IssueSeverity.DANGER" opens>
          {{ countText(CountNoun.ITEM_NEEDS_A_LOOK, reading.totals.needsALook) }}
        </IssueButton>
      </template>
      <p class="text-label mb-2">{{ t('download_needs_look_title') }}</p>
      <ul class="flex flex-col gap-1.5">
        <AppCallout v-for="(item, index) in reading.needsALook" :key="index" as="li" :color="ColorIntent.DANGER">
          <span class="mr-1.5 text-meta">{{ item.subject.label }}</span>
          {{ dropSentence(item.drop) }}
        </AppCallout>
      </ul>
    </AppPopover>

    <AppPopover v-if="warningItems.length > 0" class="w-96">
      <template #trigger>
        <IssueButton :severity="IssueSeverity.WARNING" opens>
          {{ countText(CountNoun.WARNING, reading.totals.warnings) }}
        </IssueButton>
      </template>
      <p class="text-label mb-2">{{ t('download_warnings_title') }}</p>
      <ul class="flex flex-col gap-1.5">
        <AppCallout v-for="(item, index) in warningItems" :key="index" as="li" :color="ColorIntent.WARNING">
          <span class="mr-1.5 text-meta">{{ item.title }}</span>
          {{ warningSentence(item.warning) }}
        </AppCallout>
      </ul>
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
