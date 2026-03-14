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

const OUTPUT_FILENAMES: Record<"kdvp" | "div" | "ifi", { xml: string; csv: string }> = {
  kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
  div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
  ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

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
    const xmlContents = await Promise.all(
      Array.from(xmlFiles.value).map((f) => f.text()),
    );

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
    const financialEvents =
      groupingProcessor.processStagingFinancialEvents(stagingEvents);

    const provider = new SlovenianTaxAuthorityProvider(
      taxPayerInfo,
      reportConfig,
      container.get(ApplyIdentifierRelationshipsService),
      container.get(KdvpReportGenerator),
      container.get(DivReportGenerator),
      container.get(IfiReportGenerator),
    );

    const selectedType = REPORT_MAP[reportType.value];
    const xml = await provider.generateExportForTaxAuthority(
      selectedType,
      financialEvents,
    );
    const csv = await provider.generateSpreadsheetExport(
      selectedType,
      financialEvents,
    );

    xmlOutput.value = xml;
    csvOutput.value = csv;

    xmlUrl.value = URL.createObjectURL(
      new Blob([xml], { type: "application/xml" }),
    );
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
  <div
    style="
      max-width: 800px;
      margin: 2rem auto;
      font-family: sans-serif;
      padding: 0 1rem;
    "
  >
    <h1>IB Tax Calculator</h1>

    <form @submit.prevent="generate">
      <fieldset style="margin-bottom: 1rem">
        <legend>IBKR Export</legend>
        <label
          >XML file(s):
          <input
            type="file"
            accept=".xml"
            multiple
            @change="onFileChange"
            required
        /></label>
      </fieldset>

      <fieldset style="margin-bottom: 1rem">
        <legend>Report Settings</legend>
        <label
          >Year:
          <input
            type="number"
            v-model.number="year"
            min="2010"
            max="2100"
            required
        /></label>
        &nbsp;
        <label>
          Report type:
          <select v-model="reportType">
            <option value="kdvp">KDVP (Stocks)</option>
            <option value="div">DIV (Dividends)</option>
            <option value="ifi">IFI (Derivatives)</option>
          </select>
        </label>
      </fieldset>

      <fieldset style="margin-bottom: 1rem">
        <legend>Tax Payer Info</legend>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem">
          <label>Tax number: <input v-model="taxNumber" required /></label>
          <label>Full name: <input v-model="fullName" required /></label>
          <label>Address: <input v-model="address1" required /></label>
          <label>City: <input v-model="city" required /></label>
          <label>Post number: <input v-model="postNumber" required /></label>
          <label>Post name: <input v-model="postName" required /></label>
          <label>Country ID: <input v-model="countryId" required /></label>
          <label>Country name: <input v-model="countryName" required /></label>
        </div>
      </fieldset>

      <button type="submit" :disabled="loading">
        {{ loading ? "Generating…" : "Generate Report" }}
      </button>
    </form>

    <div v-if="error" style="color: red; margin-top: 1rem">{{ error }}</div>

    <div v-if="csvOutput" style="margin-top: 1.5rem">
      <h2>Result</h2>
      <div style="margin-bottom: 0.5rem">
        <a :href="xmlUrl!" :download="OUTPUT_FILENAMES[reportType].xml"
          >Download XML</a
        >
        &nbsp;|&nbsp;
        <a :href="csvUrl!" :download="OUTPUT_FILENAMES[reportType].csv"
          >Download CSV</a
        >
      </div>
      <pre
        style="
          background: #f4f4f4;
          padding: 1rem;
          overflow: auto;
          max-height: 500px;
          font-size: 0.8rem;
        "
        >{{ csvOutput }}</pre
      >
    </div>
  </div>
</template>
