<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { useInstrumentStats } from "~/composables/useInstrumentStats";

const props = defineProps<{
  name: string;
  isin: string;
  groupings: FinancialGrouping[];
}>();

const open = defineModel<boolean>("open", { default: false });

const { t, locale } = useI18n();

const stockTrades = computed(() => props.groupings.flatMap((g) => g.stockTrades));
const cashTransactions = computed(() => props.groupings.flatMap((g) => g.cashTransactions));
const derivativeGroupings = computed(() => props.groupings.flatMap((g) => g.derivativeGroupings));

const stats = computed(() => useInstrumentStats(props.groupings));

const xMin = computed(() => stats.value.overallCumulativeSeries[0]?.date.toJSDate().getTime());
const xMax = computed(() => stats.value.overallCumulativeSeries[stats.value.overallCumulativeSeries.length - 1]?.date.toJSDate().getTime());
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 app-overlay" />
      <DialogContent
        class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,820px)] max-h-[85vh] flex flex-col app-surface-overlay border app-border-strong rounded-lg shadow-xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-5 py-4 border-b app-border shrink-0">
          <div class="flex flex-col gap-0.5 min-w-0">
            <DialogTitle class="text-h5 truncate">{{ name }}</DialogTitle>
            <span class="text-caption font-mono">{{ isin }}</span>
          </div>
          <DialogClose class="button-ghost shrink-0 p-1">
            <span class="i-mdi-close text-lg block" />
          </DialogClose>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex flex-col gap-6 px-5 py-4">
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
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
