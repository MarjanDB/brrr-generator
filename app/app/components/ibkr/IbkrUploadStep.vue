<script setup lang="ts">
import {
  BrokerageRegistry,
  createContainer,
  type FinancialEvents,
  StagingFinancialEvents,
  StagingFinancialGroupingProcessor,
} from "@brrr/lib";
import BrokerSupportSection from "~/components/upload/BrokerSupportSection.vue";
import { BROKER_GUIDES } from "~/components/upload/brokerGuides";
import { ApiInfoProvider } from "~/utils/ApiInfoProvider";

const props = defineProps<{
  collapsed: boolean;
  fileCount: number;
}>();

const emit = defineEmits<{
  processed: [financialEvents: FinancialEvents, files: FileList];
}>();

const { t } = useI18n();

const brokerIconById: Record<string, string> = {
  ibkr: "/icons/brokers/ibkr.svg",
};

function brokerIconUrl(brokerId: string): string | null {
  return brokerIconById[brokerId] ?? null;
}

const xmlFiles = ref<FileList | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const processedEvents = shallowRef<FinancialEvents | null>(null);
const processedFiles = shallowRef<FileList | null>(null);
const detections = ref<
  { fileName: string; detectedBrokerage: { id: string; name: string } | null }[]
>([]);

const validateFiles = (v: FileList | null) =>
  v && v.length > 0 ? null : t("validation_select_files");

let processingVersion = 0;

async function processSelectedFiles(files: FileList) {
  error.value = null;
  loading.value = true;
  detections.value = [];
  processedEvents.value = null;
  processedFiles.value = null;

  const current = ++processingVersion;
  try {
    const xmlContents = await Promise.all(Array.from(files).map((f) => f.text()));
    if (current !== processingVersion) return;
    const container = createContainer(new ApiInfoProvider());

    const brokerageRegistry = container.get(BrokerageRegistry);
    const normalized = xmlContents.map((xml, i) => ({
      fileName: files.item(i)?.name ?? `file-${i + 1}.xml`,
      xml,
    }));

    const { detections: detectedRows, stagingEvents } =
      brokerageRegistry.loadAndTransformDetected(normalized);
    if (current !== processingVersion) return;

    detections.value = detectedRows;

    const financialEvents = container
      .get(StagingFinancialGroupingProcessor)
      .processStagingFinancialEvents(stagingEvents);
    if (current !== processingVersion) return;
    processedEvents.value = financialEvents;
    processedFiles.value = files;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (current === processingVersion) loading.value = false;
  }
}

function onContinue() {
  if (!processedEvents.value || !processedFiles.value) return;
  emit("processed", processedEvents.value, processedFiles.value);
}

watch(xmlFiles, (v) => {
  if (!v || v.length === 0) {
    processingVersion++;
    detections.value = [];
    processedEvents.value = null;
    processedFiles.value = null;
    error.value = null;
    loading.value = false;
    return;
  }
  processSelectedFiles(v);
});
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-icon-confirm text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('ibkr_export_title') }}</span>
      <span class="text-body-sm app-text-muted">{{ t('upload_summary', { n: fileCount }) }}</span>
    </div>
  </div>

  <div v-else class="card card-padding-md flex flex-col gap-3">
    <h2 class="text-h5">{{ t('ibkr_export_title') }}</h2>
    <p class="text-body-sm app-text-muted">{{ t('ibkr_export_hint') }}</p>
    
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
          <div class="text-body-sm app-text-muted">
            {{ t('upload_summary', { n: detections.length }) }}
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b app-border-strong">
                  <th class="text-left py-2 pr-4 font-medium app-text">
                    {{ t('upload_detection_file') }}
                  </th>
                  <th class="text-left py-2 pr-2 font-medium app-text">
                    {{ t('upload_detection_brokerage') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in detections"
                  :key="row.fileName"
                  class="border-b app-border last:border-0"
                >
                  <td class="pl-2 py-2 pr-4 app-text font-mono text-xs">{{ row.fileName }}</td>
                  <td class="py-2 pr-2">
                    <span v-if="row.detectedBrokerage" class="inline-flex items-center gap-2 app-text">
                      <img
                        v-if="brokerIconUrl(row.detectedBrokerage.id)"
                        :src="brokerIconUrl(row.detectedBrokerage.id) ?? ''"
                        :alt="row.detectedBrokerage.name"
                        class="h-4 w-4 shrink-0"
                      />
                      <span>{{ row.detectedBrokerage.name }}</span>
                    </span>
                    <span v-else class="app-text-muted">{{ t('upload_detection_unknown') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="detections.some((d) => d.detectedBrokerage === null)"
            class="text-body-sm app-text-muted"
          >
            {{ t('upload_detection_ignored') }}
          </div>
        </div>

        <div v-if="error" class="alert-error">{{ error }}</div>
        <AppButton
          class="button-filled-primary self-start"
          type="submit"
          :loading="loading"
          :disabled="processedEvents === null"
        >
          {{ t('upload_button') }}
        </AppButton>
      </div>
    </AppForm>
  </div>
</template>
