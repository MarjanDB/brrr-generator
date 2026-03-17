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

const reportTypeOptions = [
	{ value: "kdvp", label: "KDVP (Stocks)" },
	{ value: "div", label: "DIV (Dividends)" },
	{ value: "ifi", label: "IFI (Derivatives)" },
];

// Validators
const validateRequired = (v: string) => v.trim() ? null : "This field is required";
const validateFiles = (v: FileList | null) => (v && v.length > 0) ? null : "Please select at least one XML file";
const validateYear = (v: number | null) => {
	if (v === null) return "This field is required";
	if (!Number.isInteger(v) || v < 2010 || v > 2100) return "Must be a year between 2010 and 2100";
	return null;
};
const validateReportType = (v: string) => v ? null : "Please select a report type";

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
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<h1 class="text-h1">BRRR Generator</h1>
				<a href="https://github.com/MarjanDB/brrr-generator" target="_blank" rel="noopener" aria-label="GitHub repository" class="i-mdi-github text-2xl app-text-muted hover:app-text transition-colors" />
			</div>
			<AppButton class="button-filled-neutral" @click="$toggleTheme()">
				{{ $theme === "dark" ? "Light mode" : "Dark mode" }}
			</AppButton>
		</div>

		<AppForm class="flex flex-col gap-4" @submit="onSubmit">
			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">IBKR Export</h2>
				<p class="text-body-sm">select all of your IBKR XML exports for and before the year you are reporting on</p>
				<AppFileInput
					v-model="xmlFiles"
					label="XML file(s)"
					accept=".xml"
					multiple
					:validate="validateFiles"
				/>
			</div>

			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">Report Settings</h2>
				<div class="grid grid-cols-2 gap-3">
					<AppNumberInput
						v-model="year"
						label="Year"
						:min="2010"
						:max="2100"
						:validate="validateYear"
					/>
					<AppSelect
						v-model="reportType"
						label="Report type"
						placeholder="Select a report type"
						:options="reportTypeOptions"
						:validate="validateReportType"
					/>
				</div>
			</div>

			<div class="card card-padding-md flex flex-col gap-3">
				<h2 class="text-h5">Tax Payer Info</h2>
				<div class="grid grid-cols-2 gap-3">
					<AppTextInput v-model="taxNumber" label="Tax number" :validate="validateRequired" />
					<AppTextInput v-model="fullName" label="Full name" :validate="validateRequired" />
					<AppTextInput v-model="address1" label="Address" :validate="validateRequired" />
					<AppTextInput v-model="city" label="City" :validate="validateRequired" />
					<AppTextInput v-model="postNumber" label="Post number" :validate="validateRequired" />
					<AppTextInput v-model="postName" label="Post name" :validate="validateRequired" />
					<AppTextInput v-model="countryId" label="Country ID" :validate="validateRequired" />
					<AppTextInput v-model="countryName" label="Country name" :validate="validateRequired" />
				</div>
			</div>

			<AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
				Generate Report
			</AppButton>
		</AppForm>

		<div v-if="error" class="alert-error">{{ error }}</div>

		<div v-if="csvOutput" class="flex flex-col gap-3">
			<h2 class="text-h3">Result</h2>
			<div class="flex gap-3">
				<a :href="xmlUrl!" :download="OUTPUT_FILENAMES[reportType].xml" class="button-filled-secondary">Download XML</a>
				<a :href="csvUrl!" :download="OUTPUT_FILENAMES[reportType].csv" class="button-filled-secondary">Download CSV</a>
			</div>
			<pre class="card card-padding-md text-body-sm overflow-auto max-h-120">{{ csvOutput }}</pre>
		</div>
	</div>
</template>
