<script setup lang="ts">
import BrokerGuideCard from "~/components/guide/BrokerGuideCard.vue";
import type { BrokerGuide } from "~/utils/brokerGuides";

defineProps<{
  brokers: BrokerGuide[];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-label app-text-muted">{{ t('broker_support_section_title') }}</span>
    <div class="flex flex-col gap-2">
      <BrokerGuideCard v-for="broker in brokers" :key="broker.id" :broker="broker" />
    </div>
  </div>
</template>
