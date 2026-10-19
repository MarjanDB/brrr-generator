<script setup lang="ts">
import GuideModal from "~/components/guide/GuideModal.vue";
import type { BrokerGuide } from "~/utils/brokerGuides";

defineProps<{
  broker: BrokerGuide;
}>();

const { t } = useI18n();
</script>

<template>
  <!-- A broker as a card that opens its export guide: in the upload step and on the landing page. -->
  <GuideModal
    :name-key="broker.modalTitleKey"
    :tagline-key="broker.taglineKey"
    :icon-url="broker.iconUrl"
    :steps="broker.steps"
  >
    <template #trigger>
      <button
        type="button"
        class="flex items-center gap-3 rounded-lg border app-border p-3 app-surface-raised w-full h-full text-left app-row-interactive"
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
      </button>
    </template>
  </GuideModal>
</template>
