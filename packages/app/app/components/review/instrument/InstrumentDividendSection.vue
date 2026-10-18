<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import { useI18n } from 'vue-i18n';
import type { CumulativePoint } from "~/composables/useInstrumentStats";
import type { ImportSources } from "~/review/ImportSources";

type CashTx = FinancialGrouping["cashTransactions"][number];

defineProps<{
  transactions: CashTx[];
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
    <h3 class="text-label">{{ t("preview_section_dividends") }}</h3>
    <DividendCumulativeChart
      v-if="cumulativeSeries.length > 0"
      :series="cumulativeSeries"
      :base-currency="baseCurrency"
      :locale="locale"
      :x-min="xMin"
      :x-max="xMax"
    />
    <DividendTransactionsTable :transactions="transactions" :base-currency="baseCurrency" :sources="sources" />
  </section>
</template>
