<script setup lang="ts">
import type { BrokerGuide } from "~/utils/brokerGuides";
import GuideModal from "../guide/GuideModal.vue";

defineProps<{
  brokers: BrokerGuide[];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-label app-text-muted">{{ t('broker_support_section_title') }}</span>
    <div class="flex flex-col gap-2">
      <GuideModal
        v-for="broker in brokers"
        :key="broker.id"
        :name-key="broker.modalTitleKey"
        :tagline-key="broker.taglineKey"
        :icon-url="broker.iconUrl"
        :steps="broker.steps"
      >
        <template #trigger>
          <button
            type="button"
            class="flex items-center gap-3 rounded-lg border app-border p-3 app-surface-raised w-full text-left app-row-interactive"
          >
            <img
              :src="broker.iconUrl"
              :alt="t(broker.nameKey)"
              class="logo-tile h-10 w-10 shrink-0"
            />
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <span class="text-body font-medium app-text">{{ t(broker.nameKey) }}</span>
              <span class="text-body-sm app-text-muted">{{ t(broker.taglineKey) }}</span>
            </div>
            <span class="i-mdi-help-circle-outline text-lg app-text-muted shrink-0" />
          </button>
        </template>
      </GuideModal>
    </div>
  </div>
</template>
