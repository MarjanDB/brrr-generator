<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { InstrumentStats } from "~/composables/useInstrumentStats";

defineProps<{
  stats: InstrumentStats;
  locale: string;
  xMin?: number;
  xMax?: number;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col gap-3">
    <h3 class="text-label">{{ t("preview_section_summary") }}</h3>
    <SummaryStatCards :stats="stats" :locale="locale" />
    <SummaryCumulativeChart
      v-if="stats.overallCumulativeSeries.length > 0"
      :series="stats.overallCumulativeSeries"
      :base-currency="stats.baseCurrency"
      :locale="locale"
      :x-min="xMin"
      :x-max="xMax"
    />
  </section>
</template>
