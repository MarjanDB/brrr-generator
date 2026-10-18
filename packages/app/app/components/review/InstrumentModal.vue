<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import AppDialog from "~/components/ui/AppDialog.vue";
import { useInstrumentStats } from "~/composables/useInstrumentStats";
import { DialogSize } from "~/types/ui";

const props = defineProps<{
  name: string;
  isin: string;
  groupings: FinancialGrouping[];
  // The row's button, which gets the focus back when the dialog closes.
  returnFocus: HTMLElement | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const { locale } = useI18n();

const stockTrades = computed(() => props.groupings.flatMap((g) => g.stockTrades));
const cashTransactions = computed(() => props.groupings.flatMap((g) => g.cashTransactions));
const derivativeGroupings = computed(() => props.groupings.flatMap((g) => g.derivativeGroupings));

const stats = computed(() => useInstrumentStats(props.groupings));

const xMin = computed(() => stats.value.overallCumulativeSeries[0]?.date.toJSDate().getTime());
const xMax = computed(() => stats.value.overallCumulativeSeries[stats.value.overallCumulativeSeries.length - 1]?.date.toJSDate().getTime());
</script>

<template>
  <AppDialog v-model:open="open" :title="name" :size="DialogSize.FULL" :return-focus="returnFocus">
    <template #description>
      <span class="font-mono">{{ isin }}</span>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Summary: always shown -->
      <InstrumentSummarySection :stats="stats" :locale="locale" :x-min="xMin" :x-max="xMax" />

      <div v-if="stockTrades.length > 0 || cashTransactions.length > 0 || derivativeGroupings.length > 0" class="border-t app-border" />

      <!-- Stock trades -->
      <InstrumentStockSection
        v-if="stockTrades.length > 0"
        :trades="stockTrades"
        :cumulative-series="stats.stockCumulativeSeries"
        :base-currency="stats.baseCurrency"
        :locale="locale"
        :x-min="xMin"
        :x-max="xMax"
      />

      <!-- Cash transactions -->
      <InstrumentDividendSection
        v-if="cashTransactions.length > 0"
        :transactions="cashTransactions"
        :cumulative-series="stats.dividendCumulativeSeries"
        :base-currency="stats.baseCurrency"
        :locale="locale"
        :x-min="xMin"
        :x-max="xMax"
      />

      <!-- Derivatives -->
      <InstrumentDerivativeSection
        v-if="derivativeGroupings.length > 0"
        :derivative-groupings="derivativeGroupings"
        :cumulative-series="stats.derivativeCumulativeSeries"
        :base-currency="stats.baseCurrency"
        :locale="locale"
        :x-min="xMin"
        :x-max="xMax"
      />
    </div>
  </AppDialog>
</template>
