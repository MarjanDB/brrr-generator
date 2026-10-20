<script setup lang="ts">
import type { ReportProvenance } from "@brrr/lib";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import TaxpayerDialog from "~/components/download/TaxpayerDialog.vue";
import GuideModal from "~/components/guide/GuideModal.vue";
import AppButton from "~/components/ui/AppButton.vue";
import IssueButton from "~/components/ui/IssueButton.vue";
import { CountNoun } from "~/types/counts";
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { TaxAuthorityGuide } from "~/types/guide";
import type { TaxAuthorityForm } from "~/types/taxYearReports";
import { ButtonVariant, IssueSeverity } from "~/types/ui";

const props = defineProps<{
	outputs: GeneratedOutputs;
	form: TaxAuthorityForm;
	reading: ReportProvenance;
	guide: TaxAuthorityGuide | undefined;
}>();

const { t } = useI18n();
const { countText } = useCountText();
const reports = useTaxYearReports();
// The report step's own problems: each button opens the Problems tab on them. What the import left
// out is the review step's.
const problems = useReportProblems();
const openWarnings = problems.openProblemCount;

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
const noIssues = computed(() => problems.openCount.value === 0);

const csvUrl = ref<string | null>(null);

function dropCsvUrl() {
	if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
	csvUrl.value = null;
}

// The CSV link follows the report: one made again, with a payer defined by hand, links its own.
function linkCsv(csv: string) {
	dropCsvUrl();
	csvUrl.value = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
}

onMounted(() => linkCsv(props.outputs.csv));
watch(
	() => props.outputs.csv,
	(csv) => linkCsv(csv),
);
onUnmounted(dropCsvUrl);

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

    <!-- A problem is a button that says what it is and opens it in the Problems tab. -->
    <IssueButton
      v-if="reading.totals.needsALook > 0"
      :severity="IssueSeverity.DANGER"
      @click="problems.review(problems.leftOutKey(0))"
    >
      {{ countText(CountNoun.ITEM_NEEDS_A_LOOK, reading.totals.needsALook) }}
    </IssueButton>
    <IssueButton v-if="openWarnings > 0" :severity="IssueSeverity.WARNING" @click="problems.review(null)">
      {{ countText(CountNoun.WARNING, openWarnings) }}
    </IssueButton>

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
