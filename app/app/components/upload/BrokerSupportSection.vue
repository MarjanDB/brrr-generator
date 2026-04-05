<script setup lang="ts">
import BrokerExportGuideModal from "./BrokerExportGuideModal.vue";
import type { BrokerGuide } from "./brokerGuides";

defineProps<{
  brokers: BrokerGuide[];
}>();

const { t } = useI18n();

const openGuideId = ref<string | null>(null);

function openGuide(id: string) {
  openGuideId.value = id;
}

function isOpen(id: string) {
  return openGuideId.value === id;
}

function setOpen(id: string, val: boolean) {
  openGuideId.value = val ? id : null;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-label app-text-muted">{{ t('broker_support_section_title') }}</span>
    <div class="flex flex-col gap-2">
      <button
        v-for="broker in brokers"
        :key="broker.id"
        type="button"
        class="flex items-center gap-3 rounded-lg border app-border p-3 app-surface-raised w-full text-left app-row-interactive"
        @click="openGuide(broker.id)"
      >
        <img
          :src="broker.iconUrl"
          :alt="t(broker.nameKey)"
          class="h-8 w-8 shrink-0"
        />
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <span class="text-body font-medium app-text">{{ t(broker.nameKey) }}</span>
          <span class="text-body-sm app-text-muted">{{ t(broker.taglineKey) }}</span>
        </div>
        <span class="i-mdi-help-circle-outline text-lg app-text-muted shrink-0" />

        <BrokerExportGuideModal
          :broker="broker"
          :open="isOpen(broker.id)"
          @update:open="(val) => setOpen(broker.id, val)"
        />
      </button>
    </div>
  </div>
</template>
