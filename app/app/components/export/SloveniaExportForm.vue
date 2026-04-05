<script setup lang="ts">
import {
  createContainer,
  type FinancialEvents,
  TaxAuthorityLotMatchingMethod,
  TaxAuthorityRegistry,
  TaxPayerConfigSchema,
  zDateTimeFromISOString,
} from "@brrr/lib";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
  financialEvents: FinancialEvents;
}>();

const emit = defineEmits<{
  generated: [outputs: { xml: string; csv: string; xmlFilename: string; csvFilename: string }];
}>();

const { t } = useI18n();

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

const error = ref<string | null>(null);
const loading = ref(false);

const container = createContainer(new ApiInfoProvider());
const registry = container.get(TaxAuthorityRegistry);

const FILENAMES: Record<string, { xml: string; csv: string }> = {
  kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
  div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
  ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

const reportTypeOptions = computed(() => [
  { value: "kdvp", label: t("report_type_kdvp") },
  { value: "div", label: t("report_type_div") },
  { value: "ifi", label: t("report_type_ifi") },
]);

const validateRequired = (v: string) => (v.trim() ? null : t("validation_required"));
const validateYear = (v: number | null) => {
  if (v === null) return t("validation_required");
  if (!Number.isInteger(v) || v < 2010 || v > 2100) return t("validation_year");
  return null;
};
const validateReportType = (v: string) => (v ? null : t("validation_select_report_type"));

async function onSubmit(valid: boolean) {
  if (!valid || year.value === null) return;
  const selectedYear = year.value;
  error.value = null;
  loading.value = true;
  try {
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
      fromDate: zDateTimeFromISOString.parse(`${selectedYear}-01-01`),
      toDate: zDateTimeFromISOString.parse(`${selectedYear + 1}-01-01`),
      lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
    };

    const { xml, csv } = await registry.generateExports({
      authorityId: "slovenia",
      reportTypeId: reportType.value,
      taxPayerInfo,
      reportConfig,
      events: props.financialEvents,
    });

    const filenames = FILENAMES[reportType.value] ?? { xml: "export.xml", csv: "export.csv" };
    emit("generated", { xml, csv, xmlFilename: filenames.xml, csvFilename: filenames.csv });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppForm class="flex flex-col gap-4" @submit="onSubmit">
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

    <div v-if="error" class="alert-error">{{ error }}</div>

    <AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
      {{ t('generate_report') }}
    </AppButton>
  </AppForm>
</template>
