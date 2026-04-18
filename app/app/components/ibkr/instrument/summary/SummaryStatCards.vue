<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { InstrumentStats } from "~/composables/useInstrumentStats";

const props = defineProps<{
  stats: InstrumentStats;
  locale: string;
}>();

const { t } = useI18n();

const fmt = computed(
  () =>
    new Intl.NumberFormat(props.locale, {
      style: "currency",
      currency: props.stats.baseCurrency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
);

const cards = computed(() => [
  { key: "bought", label: t("preview_stat_total_bought"), value: props.stats.totalBought },
  { key: "sold", label: t("preview_stat_total_sold"), value: props.stats.totalSold },
  { key: "dividends", label: t("preview_stat_total_dividends"), value: props.stats.totalDividends },
]);
</script>

<template>
  <div class="grid grid-cols-3 gap-3">
    <div v-for="card in cards" :key="card.key" class="card p-3 flex flex-col gap-1">
      <span class="text-caption">{{ card.label }}</span>
      <span class="text-base font-semibold tabular-nums app-text">
        {{ fmt.format(card.value) }}
      </span>
    </div>
  </div>
</template>
