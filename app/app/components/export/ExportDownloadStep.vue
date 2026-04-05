<script setup lang="ts">
import { findTaxAuthorityGuide } from "~/components/download/taxAuthorityGuides";
import GuideModal from "~/components/guide/GuideModal.vue";

const props = defineProps<{
  outputs: { xml: string; csv: string; xmlFilename: string; csvFilename: string; authorityId: string; reportTypeId: string };
}>();

const emit = defineEmits<{
  restart: [];
}>();

const { t } = useI18n();

const xmlUrl = ref<string | null>(null);
const csvUrl = ref<string | null>(null);
const guideOpen = ref(false);

const guide = computed(() =>
  findTaxAuthorityGuide(props.outputs.authorityId, props.outputs.reportTypeId),
);

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
</script>

<template>
  <div class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('result_title') }}</h2>
    <div class="flex gap-3 flex-wrap">
      <AppButton v-if="guide" class="button-filled-primary" @click="guideOpen = true">
        {{ t('tax_authority_guide_button') }}
      </AppButton>


      <a v-if="xmlUrl" :href="xmlUrl" :download="outputs.xmlFilename" class="button-filled-secondary">
        {{ t('download_xml_label') }}
      </a>

      <a v-if="csvUrl" :href="csvUrl" :download="outputs.csvFilename" class="button-filled-secondary">
        {{ t('download_csv_label') }}
      </a>


    </div>

    <AppButton class="button-filled-neutral self-start" @click="emit('restart')">
      {{ t('restart_button') }}
    </AppButton>
  </div>

  <GuideModal v-if="guide" :name-key="guide.nameKey" :steps="guide.steps" v-model:open="guideOpen" />
</template>
