<script setup lang="ts">
import {
  type FinancialEvents,
  type FinancialGrouping,
  type ProvenanceGraph,
  TradeEventCashTransactionDividend,
} from "@brrr/lib";
import { shallowRef } from "vue";

const props = defineProps<{
  financialEvents: FinancialEvents;
  provenance: ProvenanceGraph;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const { t } = useI18n();

// Built once per import: where each imported row came from, for every row's popover below.
provideImportSources(() => props.provenance);

interface InstrumentRow {
  name: string;
  isin: string;
  stockTrades: number;
  dividends: number;
  derivatives: number;
  groupings: FinancialGrouping[];
}

const rows = computed<InstrumentRow[]>(() => {
  // Group all FinancialGroupings by ISIN. Groupings that share an ISIN with a
  // stock/dividend grouping are library-level "satellites" produced because
  // derivatives use underlyingSecurityID as their ISIN — merge them in.
  const byIsin = new Map<string, InstrumentRow>();
  const noIsin: InstrumentRow[] = [];

  for (const g of props.financialEvents.groupings) {
    const isin = g.financialIdentifier.isin;
    const name = g.financialIdentifier.ticker ?? g.financialIdentifier.name ?? isin ?? "—";
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

const modalRow = shallowRef<InstrumentRow | null>(null);
const modalOpen = ref(false);
// The clicked row's button, so the focus goes back to it when the dialog closes.
const modalTrigger = shallowRef<HTMLElement | null>(null);

// The whole row opens the dialog; its button is what a keyboard reaches.
function openModal(row: InstrumentRow, event: MouseEvent) {
  modalRow.value = row;
  modalTrigger.value =
    event.currentTarget instanceof HTMLElement ? event.currentTarget.querySelector("button") : null;
  modalOpen.value = true;
}
</script>

<template>
  <StepSummaryCard v-if="collapsed" :title="t('review_instruments_title')">
    {{ t('review_summary', { n: groupingCount }) }}
  </StepSummaryCard>

  <div v-else class="card card-padding-md flex flex-col gap-4">
    <h2 class="text-h5">{{ t('review_instruments_title') }}</h2>
    <ImportLeftOutNote :provenance="provenance" />
    <div class="overflow-x-auto">
      <table class="app-table">
        <thead>
          <tr class="app-table-head-row">
            <th class="app-table-th text-left">{{ t('review_column_name') }}</th>
            <th class="app-table-th text-left">{{ t('review_column_isin') }}</th>
            <th class="app-table-th text-right">{{ t('review_column_stock_trades') }}</th>
            <th class="app-table-th text-right">{{ t('review_column_dividends') }}</th>
            <th class="app-table-th text-right">{{ t('review_column_derivatives') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="row.isin || String(i)"
            class="app-table-row app-row-interactive"
            @click="openModal(row, $event)"
          >
            <td class="app-table-td pl-2">
              <button type="button" class="text-left hover:underline">{{ row.name }}</button>
            </td>
            <td class="app-table-td font-mono text-xs"><span class="app-text-muted">{{ row.isin }}</span></td>
            <td class="app-table-td text-right">{{ row.stockTrades  }}</td>
            <td class="app-table-td text-right">{{ row.dividends  }}</td>
            <td class="app-table-td text-right">{{ row.derivatives  }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppButton class="button-filled-action self-start" @click="emit('confirmed')">
      {{ t('review_confirm_button') }}
    </AppButton>
  </div>

  <LazyInstrumentModal
    v-if="modalRow"
    v-model:open="modalOpen"
    :name="modalRow.name"
    :isin="modalRow.isin"
    :groupings="modalRow.groupings"
    :return-focus="modalTrigger"
  />
</template>
