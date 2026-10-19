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
import { ColorIntent } from "~/types/ui";
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

// An underline marks the open tab, drawn over the list's base line. The list scrolls sideways when
// the tabs don't fit, which clips anything outside it, so the focus ring is drawn inside the tab.
const tabTrigger =
	"flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted rounded-t-sm transition-colors hover:text-ink aria-selected:border-accent-edge aria-selected:text-ink app-focus-ring focus-visible:-outline-offset-2";
</script>

<template>
	<div class="card card-padding-md flex flex-col gap-4">
		<div class="flex items-center gap-3 flex-wrap">
			<span class="text-label">{{ t('tax_year_label') }}</span>
			<TaxYearPicker v-model="year" :years="years" />
			<span class="flex-1" />
			<AppButton :color="ColorIntent.NEUTRAL" @click="emit('restart')">
				{{ t('restart_button') }}
			</AppButton>
		</div>

		<TabsRoot v-model="tab" class="flex flex-col gap-4">
			<TabsList :aria-label="t('reports_tabs_label', { year })" class="flex overflow-x-auto shadow-[inset_0_-1px_0_var(--color-edge)]">
				<AppTooltip v-for="entry in tabs" :key="entry.form.reportTypeId" :content="t(entry.form.nameKey)" side="bottom">
					<TabsTrigger :value="entry.form.reportTypeId" :class="tabTrigger">
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
