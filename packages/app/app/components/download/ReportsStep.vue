<script setup lang="ts">
import {
	createContainer,
	type ImportResult,
	ProvenanceReportReader,
	ReportPipeline,
	type TaxAuthorityId,
} from "@brrr/lib";
import { DateTime } from "luxon";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import DownloadStep from "~/components/download/DownloadStep.vue";
import TaxYearPicker from "~/components/download/TaxYearPicker.vue";
import { ButtonVariant } from "~/types/ui";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
	imported: ImportResult;
	authorityId: TaxAuthorityId;
}>();

const emit = defineEmits<{
	restart: [];
}>();

const { t } = useI18n();

const pipeline = createContainer(new ApiInfoProvider()).get(ReportPipeline);

const years = computed(() => reportYearsOf(props.imported.events));
const year = ref(defaultTaxYear(years.value, DateTime.now()));

const forms = computed(() => taxAuthorityFormsOf(props.authorityId));
const { reports, pending, error } = provideTaxYearReports({
	pipeline,
	imported: () => props.imported,
	authorityId: () => props.authorityId,
	year: () => year.value,
});

// The open tab, by its form's report type. It stays on its form when the year changes.
const tab = ref(forms.value[0]?.reportTypeId ?? "");
watch(forms, (next) => {
	if (!next.some((form) => form.reportTypeId === tab.value)) {
		tab.value = next[0]?.reportTypeId ?? "";
	}
});

// Each form's tab: what it made for the year, once it is made, and how many lines that has.
const tabs = computed(() =>
	forms.value.map((form) => {
		const report = reports.value.find((candidate) => candidate.form === form) ?? null;
		return {
			form,
			report,
			lines:
				report === null
					? null
					: new ProvenanceReportReader().read(report.outputs.provenance).totals.lines,
		};
	}),
);
</script>

<template>
	<div class="card card-padding-md flex flex-col gap-4">
		<div class="flex items-center gap-3 flex-wrap">
			<span class="text-label">{{ t('tax_year_label') }}</span>
			<TaxYearPicker v-model="year" :years="years" />
			<span class="flex-1" />
			<AppButton :variant="ButtonVariant.SECONDARY" @click="emit('restart')">
				{{ t('restart_button') }}
			</AppButton>
		</div>

		<TabsRoot v-model="tab" class="flex flex-col gap-4">
			<TabsList :aria-label="t('reports_tabs_label', { year })" :class="tabListClasses">
				<AppTooltip v-for="entry in tabs" :key="entry.form.reportTypeId" :content="t(entry.form.nameKey)" side="bottom">
					<TabsTrigger :value="entry.form.reportTypeId" :class="tabTriggerClasses">
						{{ entry.form.code }}
						<AppBadge v-if="entry.lines !== null">{{ entry.lines }}</AppBadge>
					</TabsTrigger>
				</AppTooltip>
			</TabsList>

			<TabsContent v-for="entry in tabs" :key="entry.form.reportTypeId" :value="entry.form.reportTypeId">
				<p v-if="pending" class="flex items-center gap-2 text-sm app-text-muted">
					<span class="i-mdi-loading animate-spin" aria-hidden="true" />
					{{ t('reports_making', { year }) }}
				</p>
				<div v-else-if="error !== null" class="alert-error">{{ error }}</div>
				<DownloadStep v-else-if="entry.report !== null" :outputs="entry.report.outputs" :form="entry.form" />
			</TabsContent>
		</TabsRoot>
	</div>
</template>
