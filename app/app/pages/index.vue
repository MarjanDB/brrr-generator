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

// biome-ignore lint/correctness/noUnusedVariables: used in template
const { $toggleTheme, $theme } = useNuxtApp();

// Form state
const xmlFiles = ref<FileList | null>(null);
const year = ref(new Date().getFullYear() - 1);
const reportType = ref<"kdvp" | "div" | "ifi">("kdvp");
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

const REPORT_MAP: Record<"kdvp" | "div" | "ifi", SlovenianTaxAuthorityReportTypes> = {
	kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
	div: SlovenianTaxAuthorityReportTypes.DOH_DIV,
	ifi: SlovenianTaxAuthorityReportTypes.D_IFI,
};

// biome-ignore lint/correctness/noUnusedVariables: used in template
const OUTPUT_FILENAMES: Record<"kdvp" | "div" | "ifi", { xml: string; csv: string }> = {
	kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
	div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
	ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

// biome-ignore lint/correctness/noUnusedVariables: used in template
function onFileChange(e: Event) {
	const input = e.target as HTMLInputElement;
	xmlFiles.value = input.files ?? null;
}

function revokeUrls() {
	if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
	if (xmlUrl.value) URL.revokeObjectURL(xmlUrl.value);
	csvUrl.value = null;
	xmlUrl.value = null;
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function generate() {
	error.value = null;
	csvOutput.value = null;
	xmlOutput.value = null;
	revokeUrls();

	if (!xmlFiles.value || xmlFiles.value.length === 0) {
		error.value = "Please select at least one IBKR XML file.";
		return;
	}

	loading.value = true;
	try {
		const xmlContents = await Promise.all(Array.from(xmlFiles.value).map((f) => f.text()));

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
			toDate: zDateTimeFromISOString.parse(`${year.value + 1}-01-01`),
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
      <h1 class="text-h1">IB Tax Calculator</h1>
      <button @click="$toggleTheme()" class="btn-subtle-neutral">
        {{ $theme === "dark" ? "Light mode" : "Dark mode" }}
      </button>
    </div>

    <form @submit.prevent="generate" class="flex flex-col gap-4">
      <div class="card card-padding-md flex flex-col gap-3">
        <h2 class="text-h5">IBKR Export</h2>
        <label class="flex flex-col gap-1">
          <span class="text-body-sm">XML file(s)</span>
          <input
            type="file"
            accept=".xml"
            multiple
            @change="onFileChange"
            required
            class="input-md"
          />
        </label>
      </div>

      <div class="card card-padding-md flex flex-col gap-3">
        <h2 class="text-h5">Report Settings</h2>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Year</span>
            <input
              type="number"
              v-model.number="year"
              min="2010"
              max="2100"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Report type</span>
            <select
              v-model="reportType"
              class="input-md"
            >
              <option value="kdvp">KDVP (Stocks)</option>
              <option value="div">DIV (Dividends)</option>
              <option value="ifi">IFI (Derivatives)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="card card-padding-md flex flex-col gap-3">
        <h2 class="text-h5">Tax Payer Info</h2>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Tax number</span>
            <input
              v-model="taxNumber"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Full name</span>
            <input
              v-model="fullName"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Address</span>
            <input
              v-model="address1"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">City</span>
            <input
              v-model="city"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Post number</span>
            <input
              v-model="postNumber"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Post name</span>
            <input
              v-model="postName"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Country ID</span>
            <input
              v-model="countryId"
              required
              class="input-md"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-body-sm">Country name</span>
            <input
              v-model="countryName"
              required
              class="input-md"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="btn-filled-primary self-start"
        :class="{ 'state-loading': loading }"
      >
        {{ loading ? "Generating…" : "Generate Report" }}
      </button>
    </form>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <div v-if="csvOutput" class="flex flex-col gap-3">
      <h2 class="text-h3">Result</h2>
      <div class="flex gap-3">
        <a
          :href="xmlUrl!"
          :download="OUTPUT_FILENAMES[reportType].xml"
          class="btn-subtle-secondary"
          >Download XML</a
        >
        <a
          :href="csvUrl!"
          :download="OUTPUT_FILENAMES[reportType].csv"
          class="btn-subtle-secondary"
          >Download CSV</a
        >
      </div>
      <pre
        class="card card-padding-md text-body-sm overflow-auto max-h-120"
        >{{ csvOutput }}</pre
      >
    </div>
  </div>
</template>
