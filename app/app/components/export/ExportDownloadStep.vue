<script setup lang="ts">
const props = defineProps<{
  outputs: { xml: string; csv: string; reportType: "kdvp" | "div" | "ifi" };
}>();

const emit = defineEmits<{
  restart: [];
}>();

const { t } = useI18n();

const OUTPUT_FILENAMES: Record<"kdvp" | "div" | "ifi", { xml: string; csv: string }> = {
  kdvp: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
  div: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
  ifi: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

const xmlUrl = ref<string | null>(null);
const csvUrl = ref<string | null>(null);

function revokeUrls() {
  if (xmlUrl.value) URL.revokeObjectURL(xmlUrl.value);
  if (csvUrl.value) URL.revokeObjectURL(csvUrl.value);
  xmlUrl.value = null;
  csvUrl.value = null;
}

onMounted(() => {
  xmlUrl.value = URL.createObjectURL(
    new Blob([props.outputs.xml], { type: "application/xml" }),
  );
  csvUrl.value = URL.createObjectURL(
    new Blob([props.outputs.csv], { type: "text/csv" }),
  );
});

onUnmounted(revokeUrls);

const filenames = computed(() => OUTPUT_FILENAMES[props.outputs.reportType]);
</script>

<template>
  <div class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('result_title') }}</h2>
    <div class="flex gap-3 flex-wrap">
      <a
        v-if="xmlUrl"
        :href="xmlUrl"
        :download="filenames.xml"
        class="button-filled-secondary"
      >
        {{ t('download_xml_label') }}
      </a>
      <a
        v-if="csvUrl"
        :href="csvUrl"
        :download="filenames.csv"
        class="button-filled-secondary"
      >
        {{ t('download_csv_label') }}
      </a>
    </div>
    <AppButton class="button-filled-neutral self-start" @click="emit('restart')">
      {{ t('restart_button') }}
    </AppButton>
  </div>
</template>
