<script setup lang="ts">
import { createContainer, type ImportResult, ReportPipeline } from "@brrr/lib";
import BrokerSupportSection from "~/components/upload/BrokerSupportSection.vue";

const emit = defineEmits<{
  processed: [imported: ImportResult];
}>();

const { t } = useI18n();
const info = useInfoProvider();

const brokerIconById: Record<string, string> = {
  ibkr: "/icons/brokers/ibkr.svg",
};

function brokerIconUrl(brokerId: string): string | null {
  return brokerIconById[brokerId] ?? null;
}

const xmlFiles = ref<FileList | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const processedImport = shallowRef<ImportResult | null>(null);
const detections = ref<
  { fileName: string; detectedBroker: { id: string; name: string } | null }[]
>([]);

const validateFiles = (v: FileList | null) =>
  v && v.length > 0 ? null : t("validation_select_files");

let processingVersion = 0;

async function processSelectedFiles(files: FileList) {
  error.value = null;
  loading.value = true;
  detections.value = [];
  processedImport.value = null;

  const current = ++processingVersion;
  try {
    const xmlContents = await Promise.all(Array.from(files).map((f) => f.text()));
    if (current !== processingVersion) return;
    const container = createContainer(info);

    const normalized = xmlContents.map((xml, i) => ({
      fileName: files.item(i)?.name ?? `file-${i + 1}.xml`,
      xml,
    }));

    const imported = container.get(ReportPipeline).read(normalized);
    if (current !== processingVersion) return;

    detections.value = imported.detections;
    processedImport.value = imported;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (current === processingVersion) loading.value = false;
  }
}

function onContinue() {
  if (!processedImport.value) return;
  emit("processed", processedImport.value);
}

watch(xmlFiles, (v) => {
  if (!v || v.length === 0) {
    processingVersion++;
    detections.value = [];
    processedImport.value = null;
    error.value = null;
    loading.value = false;
    return;
  }
  processSelectedFiles(v);
});
</script>

<template>
  <div class="card card-padding-md flex flex-col gap-3 w-full max-w-screen-md mx-auto">
    <h2 class="text-heading">{{ t('ibkr_export_title') }}</h2>
    <p class="text-body text-ink-muted">{{ t('ibkr_export_hint') }}</p>
    
    <BrokerSupportSection :brokers="BROKER_GUIDES" />
    
    <AppForm @submit="() => onContinue()">
      <div class="flex flex-col gap-4">
        <AppFileInput
          v-model="xmlFiles"
          :label="t('xml_files_label')"
          accept=".xml"
          multiple
          :validate="validateFiles"
        />

        <div v-if="detections.length > 0" class="flex flex-col gap-2">
          <div class="text-body text-ink-muted">
            {{ t('upload_summary', { n: detections.length }) }}
          </div>
          <div class="overflow-x-auto">
            <table class="app-table">
              <thead>
                <tr class="app-table-head-row">
                  <th class="app-table-th text-left">
                    {{ t('upload_detection_file') }}
                  </th>
                  <th class="app-table-th text-left">
                    {{ t('upload_detection_broker') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in detections"
                  :key="row.fileName"
                  class="app-table-row"
                >
                  <td class="app-table-td">{{ row.fileName }}</td>
                  <td class="app-table-td">
                    <span v-if="row.detectedBroker" class="inline-flex items-center gap-2 app-text">
                      <img
                        v-if="brokerIconUrl(row.detectedBroker.id)"
                        :src="brokerIconUrl(row.detectedBroker.id) ?? ''"
                        :alt="row.detectedBroker.name"
                        class="h-4 w-4 shrink-0"
                      />
                      <span>{{ row.detectedBroker.name }}</span>
                    </span>
                    <span v-else class="app-text-muted">{{ t('upload_detection_unknown') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="detections.some((d) => d.detectedBroker === null)"
            class="text-body text-ink-muted"
          >
            {{ t('upload_detection_ignored') }}
          </div>
        </div>

        <div v-if="error" class="alert-error">{{ error }}</div>
        <AppButton
          class="self-start"
          type="submit"
          :loading="loading"
          :disabled="processedImport === null"
        >
          {{ t('upload_button') }}
        </AppButton>
      </div>
    </AppForm>
  </div>
</template>
