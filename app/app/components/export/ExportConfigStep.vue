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
  collapsed: boolean;
}>();

const emit = defineEmits<{
  generated: [outputs: { xml: string; csv: string; reportType: "kdvp" | "div" | "ifi" }];
}>();

const { t } = useI18n();

const year = ref<number | null>(new Date().getFullYear() - 1);
const taxAuthorityId = ref("");
const reportType = ref("");
const taxNumber = ref("");
const fullName = ref("");
const address1 = ref("");
const city = ref("");
const postNumber = ref("");
const postName = ref("");
const countryId = ref("SI");
const countryName = ref("Slovenija");

// Captured after a successful generation; used in collapsed summary
const lastReportType = ref<"kdvp" | "div" | "ifi" | "">("");
const lastYear = ref<number | null>(null);

const error = ref<string | null>(null);
const loading = ref(false);

const container = createContainer(new ApiInfoProvider());
const registry = container.get(TaxAuthorityRegistry);

const authorityDescriptors = computed(() => registry.listAuthorities());

watchEffect(() => {
  if (!taxAuthorityId.value) {
    taxAuthorityId.value = authorityDescriptors.value[0]?.authorityId ?? "";
  }
});

const taxAuthorityOptions = computed(() =>
  authorityDescriptors.value.map((a) => ({ value: a.authorityId, label: a.displayName })),
);

const reportTypeOptions = computed(() => {
  const authority = authorityDescriptors.value.find((a) => a.authorityId === taxAuthorityId.value);
  if (!authority) return [];

  // For now, we have full i18n labels for the Slovenian report types.
  if (authority.authorityId === "slovenia") {
    return [
      { value: "kdvp", label: t("report_type_kdvp") },
      { value: "div", label: t("report_type_div") },
      { value: "ifi", label: t("report_type_ifi") },
    ];
  }

  return authority.reportTypes.map((rt) => ({ value: rt.reportTypeId, label: rt.displayName }));
});

const validateRequired = (v: string) => (v.trim() ? null : t("validation_required"));
const validateTaxAuthority = (v: string) => (v ? null : t("validation_required"));
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
      authorityId: taxAuthorityId.value,
      reportTypeId: reportType.value,
      taxPayerInfo,
      reportConfig,
      events: props.financialEvents,
    });

    lastReportType.value = reportType.value as "kdvp" | "div" | "ifi";
    lastYear.value = year.value;

    emit("generated", { xml, csv, reportType: reportType.value as "kdvp" | "div" | "ifi" });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-icon-confirm text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('report_settings_title') }}</span>
      <span v-if="lastYear !== null" class="text-body-sm app-text-muted">
        {{ t('export_summary', { type: lastReportType.toUpperCase(), year: lastYear }) }}
      </span>
    </div>
  </div>

  <AppForm v-else class="flex flex-col gap-4" @submit="onSubmit">
    <div class="card card-padding-md flex flex-col gap-3">
      <h2 class="text-h5">{{ t('report_settings_title') }}</h2>
      <div class="grid grid-cols-2 gap-3">
        <AppSelect
          v-model="taxAuthorityId"
          label="Tax authority"
          :placeholder="t('validation_required')"
          :options="taxAuthorityOptions"
          :validate="validateTaxAuthority"
        />
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
