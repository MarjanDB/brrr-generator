<script setup lang="ts">
import {
  createContainer,
  type FinancialEvents,
  IbkrBrokerageExportProvider,
  StagingFinancialGroupingProcessor,
} from "@brrr/lib";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
  collapsed: boolean;
  fileCount: number;
}>();

const emit = defineEmits<{
  processed: [financialEvents: FinancialEvents, files: FileList];
}>();

const { t } = useI18n();

const xmlFiles = ref<FileList | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

const validateFiles = (v: FileList | null) =>
  v && v.length > 0 ? null : t("validation_select_files");

async function onSubmit(valid: boolean) {
  if (!valid) return;
  error.value = null;
  loading.value = true;
  try {
    const xmlContents = await Promise.all(
      Array.from(xmlFiles.value!).map((f) => f.text()),
    );
    const container = createContainer(new ApiInfoProvider());
    const stagingEvents = container
      .get(IbkrBrokerageExportProvider)
      .loadAndTransform(xmlContents);
    const financialEvents = container
      .get(StagingFinancialGroupingProcessor)
      .processStagingFinancialEvents(stagingEvents);
    emit("processed", financialEvents, xmlFiles.value!);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-secondary-600 dark:text-secondary-400 text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('ibkr_export_title') }}</span>
      <span class="text-body-sm app-text-muted">{{ t('upload_summary', { n: fileCount }) }}</span>
    </div>
  </div>

  <div v-else class="card card-padding-md flex flex-col gap-3">
    <h2 class="text-h5">{{ t('ibkr_export_title') }}</h2>
    <p class="text-body-sm app-text-muted">{{ t('ibkr_export_hint') }}</p>
    <AppForm @submit="onSubmit">
      <div class="flex flex-col gap-4">
        <AppFileInput
          v-model="xmlFiles"
          :label="t('xml_files_label')"
          accept=".xml"
          multiple
          :validate="validateFiles"
        />
        <div v-if="error" class="alert-error">{{ error }}</div>
        <AppButton class="button-filled-primary self-start" type="submit" :loading="loading">
          {{ t('upload_button') }}
        </AppButton>
      </div>
    </AppForm>
  </div>
</template>
