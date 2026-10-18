<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import { useI18n } from 'vue-i18n';
import type { CumulativePoint } from "~/composables/useInstrumentStats";
import type { ImportSources } from "~/review/ImportSources";

type StockTrade = FinancialGrouping["stockTrades"][number];

defineProps<{
  trades: StockTrade[];
  cumulativeSeries: CumulativePoint[];
  baseCurrency: string;
  sources: ImportSources;
  locale: string;
  xMin?: number;
  xMax?: number;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col gap-3">
    <h3 class="text-label">{{ t("preview_section_stocks") }}</h3>
    <StockCumulativeChart
      v-if="cumulativeSeries.length > 0"
      :series="cumulativeSeries"
      :base-currency="baseCurrency"
      :locale="locale"
      :x-min="xMin"
      :x-max="xMax"
    />
    <StockTradesTable :trades="trades" :base-currency="baseCurrency" :sources="sources" />
  </section>
</template>
