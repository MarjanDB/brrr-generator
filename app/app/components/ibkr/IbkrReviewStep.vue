<script setup lang="ts">
import { type FinancialEvents, TradeEventCashTransactionDividend } from "@brrr/lib";

type Grouping = FinancialEvents["groupings"][number];

const props = defineProps<{
  financialEvents: FinancialEvents;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const { t } = useI18n();

interface InstrumentRow {
  name: string;
  isin: string;
  stockTrades: number;
  dividends: number;
  derivatives: number;
  groupings: Grouping[];
}

const rows = computed<InstrumentRow[]>(() => {
  // Group all FinancialGroupings by ISIN. Groupings that share an ISIN with a
  // stock/dividend grouping are library-level "satellites" produced because
  // derivatives use underlyingSecurityID as their ISIN — merge them in.
  const byIsin = new Map<string, InstrumentRow>();
  const noIsin: InstrumentRow[] = [];

  for (const g of props.financialEvents.groupings) {
    const isin = g.financialIdentifier.getIsin();
    const name = g.financialIdentifier.getTicker() ?? g.financialIdentifier.getName() ?? isin ?? "—";
    const stockTrades = g.stockTrades.length;
    const dividends = g.cashTransactions.filter((tx) => tx instanceof TradeEventCashTransactionDividend).length;
    const derivatives = g.derivativeGroupings.reduce((s, dg) => s + dg.derivativeTrades.length, 0);

    if (!isin) {
      noIsin.push({ name, isin: "—", stockTrades, dividends, derivatives, groupings: [g] });
      continue;
    }

    const existing = byIsin.get(isin);
    if (!existing) {
      byIsin.set(isin, { name, isin, stockTrades, dividends, derivatives, groupings: [g] });
    } else {
      if (stockTrades > 0 || dividends > 0) existing.name = name;
      existing.stockTrades += stockTrades;
      existing.dividends += dividends;
      existing.derivatives += derivatives;
      existing.groupings.push(g);
    }
  }

  return [...byIsin.values(), ...noIsin];
});

const groupingCount = computed(() => rows.value.length);

const modalRow = ref<InstrumentRow | null>(null);
const modalOpen = ref(false);

function openModal(row: InstrumentRow) {
  modalRow.value = row;
  modalOpen.value = true;
}
</script>

<template>
  <div v-if="collapsed" class="card p-3 flex items-center gap-3">
    <span class="i-mdi-check-circle text-icon-confirm text-lg shrink-0" />
    <div class="flex flex-col min-w-0">
      <span class="text-h5">{{ t('review_instruments_title') }}</span>
      <span class="text-body-sm app-text-muted">{{ t('review_summary', { n: groupingCount }) }}</span>
    </div>
  </div>

  <div v-else class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('review_instruments_title') }}</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b app-border-strong">
            <th class="text-left py-2 pr-4 font-medium app-text">{{ t('review_column_name') }}</th>
            <th class="text-left py-2 pr-4 font-medium app-text">{{ t('review_column_isin') }}</th>
            <th class="text-right py-2 pr-4 font-medium app-text">{{ t('review_column_stock_trades') }}</th>
            <th class="text-right py-2 pr-4 font-medium app-text">{{ t('review_column_dividends') }}</th>
            <th class="text-right py-2 font-medium app-text">{{ t('review_column_derivatives') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="row.isin || String(i)"
            class="border-b app-border last:border-0 app-row-interactive"
            @click="openModal(row)"
          >
            <td class="pl-2 py-2 pr-4 app-text">{{ row.name }}</td>
            <td class="py-2 pr-4 app-text-muted font-mono text-xs">{{ row.isin }}</td>
            <td class="py-2 pr-4 text-right app-text">{{ row.stockTrades  }}</td>
            <td class="py-2 pr-4 text-right app-text">{{ row.dividends  }}</td>
            <td class="py-2 pr-2 text-right app-text">{{ row.derivatives  }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppButton class="button-filled-primary self-start" @click="emit('confirmed')">
      {{ t('review_confirm_button') }}
    </AppButton>
  </div>

  <IbkrGroupingModal
    v-if="modalRow"
    v-model:open="modalOpen"
    :name="modalRow.name"
    :isin="modalRow.isin"
    :groupings="(modalRow.groupings as any)"
  />
</template>
