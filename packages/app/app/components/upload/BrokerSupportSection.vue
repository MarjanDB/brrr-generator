<script setup lang="ts">
import type { BrokerGuide } from "~/types/guide";
import GuideModal from "../guide/GuideModal.vue";

defineProps<{
  brokers: BrokerGuide[];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2">
    <h3 class="text-subheading">{{ t('broker_support_section_title') }}</h3>
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
            class="flex items-center gap-3 w-full p-3 text-left rounded-md border border-edge-strong bg-surface-raised cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface app-focus-ring"
          >
            <img
              :src="broker.iconUrl"
              :alt="t(broker.nameKey)"
              class="logo-tile h-10 w-10 shrink-0"
            />
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <span class="text-label">{{ t(broker.nameKey) }}</span>
              <span class="text-meta">{{ t(broker.taglineKey) }}</span>
            </div>
            <span class="i-mdi-help-circle-outline text-lg text-ink-muted shrink-0" aria-hidden="true" />
          </button>
        </template>
      </GuideModal>
    </div>
  </div>
</template>
