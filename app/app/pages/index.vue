<script setup lang="ts">
definePageMeta({ ssr: false });

import {
	ApplyIdentifierRelationshipsService,
	createContainer,
	DivReportGenerator,
	IbkrBrokerageExportProvider,
	IfiReportGenerator,
	KdvpReportGenerator,
	SlovenianTaxAuthorityProvider,
	SlovenianTaxAuthorityReportTypes,
	StagingFinancialGroupingProcessor,
	TaxAuthorityLotMatchingMethod,
	TaxPayerConfigSchema,
	zDateTimeFromISOString,
} from "@brrr/lib";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const { $toggleTheme, $theme } = useNuxtApp();
const { locale, setLocale, locales, t } = useI18n();

const localeOptions = computed(() =>
	locales.value.map((l) => ({ value: l.code, label: l.code === "en" ? "🇬🇧 English" : "🇸🇮 Slovenščina" })),
);
const currentLocale = computed({
	get: () => locale.value,
	set: (val) => setLocale(val as "en" | "sl"),
});

// Form state
const xmlFiles = ref<FileList | null>(null);
const year = ref<number | null>(new Date().getFullYear() - 1);
const reportType = ref("");
const taxNumber = ref("");
const fullName = ref("");
const address1 = ref("");
const city = ref("");
const postNumber = ref("");
const postName = ref("");
const countryId = ref("SI");
const countryName = ref("Slovenija");

// Output state
const csvOutput = ref<string | null>(null);
const xmlOutput = ref<string | null>(null);
const csvUrl = ref<string | null>(null);
const xmlUrl = ref<string | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

const REPORT_MAP: Record<string, SlovenianTaxAuthorityReportTypes> = {
	kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
	div: SlovenianTaxAuthorityReportTypes.DOH_DIV,
	ifi: SlovenianTaxAuthorityReportTypes.D_IFI,
};

const OUTPUT_FILENAMES: Record<string, { xml: string; csv: string }> = {
	kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
	div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
	ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

const reportTypeOptions = computed(() => [
	{ value: "kdvp", label: t("report_type_kdvp") },
	{ value: "div", label: t("report_type_div") },
	{ value: "ifi", label: t("report_type_ifi") },
]);

// Validators
const validateRequired = (v: string) => v.trim() ? null : t("validation_required");
const validateFiles = (v: FileList | null) => (v && v.length > 0) ? null : t("validation_select_files");
const validateYear = (v: number | null) => {
	if (v === null) return t("validation_required");
	if (!Number.isInteger(v) || v < 2010 || v > 2100) return t("validation_year");
	return null;
};
const validateReportType = (v: string) => v ? null : t("validation_select_report_type");

function revokeUrls() {
	if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
	if (xmlUrl.value) URL.revokeObjectURL(xmlUrl.value);
	csvUrl.value = null;
	xmlUrl.value = null;
}

async function onSubmit(valid: boolean) {
	if (!valid) return;

	error.value = null;
	csvOutput.value = null;
	xmlOutput.value = null;
	revokeUrls();

	loading.value = true;
	try {
		const xmlContents = await Promise.all(Array.from(xmlFiles.value!).map((f) => f.text()));

		const taxPayerInfo = TaxPayerConfigSchema.parse({
			taxNumber: taxNumber.value,
			taxpayerType: "FO",
			name: fullName.value,
			address1: address1.value,
			address2: null,
			city: city.value,
			postNumber: postNumber.value,
			postName: postName.value,
			municipalityName: "",
			birthDate: "1990-01-01",
			maticnaStevilka: "",
			invalidskoPodjetje: false,
			resident: true,
			activityCode: "",
			activityName: "",
			countryId: countryId.value,
			countryName: countryName.value,
		});

		const reportConfig = {
			fromDate: zDateTimeFromISOString.parse(`${year.value}-01-01`),
			toDate: zDateTimeFromISOString.parse(`${year.value! + 1}-01-01`),
			lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
		};

		const container = createContainer(new ApiInfoProvider());
		const ibkrProvider = container.get(IbkrBrokerageExportProvider);
		const groupingProcessor = container.get(StagingFinancialGroupingProcessor);

		const stagingEvents = ibkrProvider.loadAndTransform(xmlContents);
		const financialEvents = groupingProcessor.processStagingFinancialEvents(stagingEvents);

		const provider = new SlovenianTaxAuthorityProvider(
			taxPayerInfo,
			reportConfig,
			container.get(ApplyIdentifierRelationshipsService),
			container.get(KdvpReportGenerator),
			container.get(DivReportGenerator),
			container.get(IfiReportGenerator),
		);

		const selectedType = REPORT_MAP[reportType.value];
		const xml = await provider.generateExportForTaxAuthority(selectedType, financialEvents);
		const csv = await provider.generateSpreadsheetExport(selectedType, financialEvents);

		xmlOutput.value = xml;
		csvOutput.value = csv;

		xmlUrl.value = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
		csvUrl.value = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		loading.value = false;
	}
}

onUnmounted(revokeUrls);
</script>

<template>
	<div class="container-md py-8 flex flex-col gap-6">
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div class="flex items-center justify-between gap-3">
				<h1 class="text-h1">{{ t('app_title') }}</h1>
				<a href="https://github.com/MarjanDB/brrr-generator" target="_blank" rel="noopener" aria-label="GitHub repository" class="i-mdi-github text-2xl app-text-muted hover:app-text transition-colors" />
			</div>
			<div class="flex items-center gap-2">
				<AppSelect v-model="currentLocale" :options="localeOptions" />
				<AppButton class="button-filled-neutral" @click="$toggleTheme()">
					{{ $theme === "dark" ? t("theme_light") : t("theme_dark") }}
				</AppButton>
			</div>
		</div>

		<AppForm class="flex flex-col gap-4" @submit="onSubmit">
			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">{{ t('ibkr_export_title') }}</h2>
				<p class="text-body-sm">{{ t('ibkr_export_hint') }}</p>
				<AppFileInput
					v-model="xmlFiles"
					:label="t('xml_files_label')"
					accept=".xml"
					multiple
					:validate="validateFiles"
				/>
			</div>

			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">{{ t('report_settings_title') }}</h2>
				<div class="grid grid-cols-2 gap-3">
					<AppNumberInput
						v-model="year"
						:label="t('year_label')"
						:min="2010"
						:max="2100"
						:validate="validateYear"
					/>
					<AppSelect
						v-model="reportType"
						:label="t('report_type_label')"
						:placeholder="t('report_type_placeholder')"
						:options="reportTypeOptions"
						:validate="validateReportType"
					/>
				</div>
			</div>

			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">{{ t('taxpayer_info_title') }}</h2>
				<div class="grid grid-cols-2 gap-3">
					<AppTextInput v-model="taxNumber" :label="t('tax_number_label')" :validate="validateRequired" />
					<AppTextInput v-model="fullName" :label="t('full_name_label')" :validate="validateRequired" />
					<AppTextInput v-model="address1" :label="t('address_label')" :validate="validateRequired" />
					<AppTextInput v-model="city" :label="t('city_label')" :validate="validateRequired" />
					<AppTextInput v-model="postNumber" :label="t('post_number_label')" :validate="validateRequired" />
					<AppTextInput v-model="postName" :label="t('post_name_label')" :validate="validateRequired" />
					<AppTextInput v-model="countryId" :label="t('country_id_label')" :validate="validateRequired" />
					<AppTextInput v-model="countryName" :label="t('country_name_label')" :validate="validateRequired" />
				</div>
			</div>

			<AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
				{{ t('generate_report') }}
			</AppButton>
		</AppForm>

		<div v-if="error" class="alert-error">{{ error }}</div>

		<div v-if="csvOutput" class="flex flex-col gap-3">
			<h2 class="text-h3">{{ t('result_title') }}</h2>
			<div class="flex gap-3">
				<a :href="xmlUrl!" :download="OUTPUT_FILENAMES[reportType].xml" class="button-filled-secondary">{{ t('download_xml') }}</a>
				<a :href="csvUrl!" :download="OUTPUT_FILENAMES[reportType].csv" class="button-filled-secondary">{{ t('download_csv') }}</a>
			</div>
			<pre class="card card-padding-md text-body-sm overflow-auto max-h-120">{{ csvOutput }}</pre>
		</div>
	</div>
</template>
