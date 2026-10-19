<script setup lang="ts">
import {
  type FinancialEvents,
  type FinancialGrouping,
  type ProvenanceGraph,
  TradeEventCashTransactionDividend,
} from "@brrr/lib";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { shallowRef } from "vue";
import { ColorIntent } from "~/types/ui";

const props = defineProps<{
  financialEvents: FinancialEvents;
  provenance: ProvenanceGraph;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const { t } = useI18n();

// Built once per import: where each imported row came from, for every row's popover below.
const sources = provideImportSources(() => props.provenance);
// What the import left out and counted once, for the Issues tab and its trigger's counts.
const leftOut = useImportLeftOut(() => props.provenance, sources);

enum ReviewTab {
  INSTRUMENTS = "INSTRUMENTS",
  ISSUES = "ISSUES",
}

// An underline marks the open tab, drawn over the list's base line. The list scrolls sideways when
// the tabs don't fit, which clips anything outside it, so the focus ring is drawn inside the tab.
const tabTrigger =
  "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted rounded-t-sm transition-colors hover:text-ink aria-selected:border-accent-edge aria-selected:text-ink app-focus-ring focus-visible:-outline-offset-2";

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
  <div class="card card-padding-md flex flex-col gap-4 w-full max-w-screen-md mx-auto">
    <TabsRoot :default-value="ReviewTab.INSTRUMENTS" class="flex flex-col gap-4">
      <TabsList :aria-label="t('review_tabs_label')" class="flex overflow-x-auto shadow-[inset_0_-1px_0_var(--color-edge)]">
        <TabsTrigger :value="ReviewTab.INSTRUMENTS" :class="tabTrigger">
          {{ t('review_tab_instruments') }}
          <AppBadge>{{ rows.length }}</AppBadge>
        </TabsTrigger>
        <TabsTrigger :value="ReviewTab.ISSUES" :class="tabTrigger">
          {{ t('review_tab_issues') }}
          <AppBadge v-if="leftOut.needsALook > 0" :color="ColorIntent.WARNING" class="gap-1">
            <span class="i-mdi-alert-outline" aria-hidden="true" />
            <span aria-hidden="true">{{ leftOut.needsALook }}</span>
            <span class="sr-only">{{ t('review_left_out_count', { n: leftOut.needsALook }) }}</span>
          </AppBadge>
          <AppBadge v-if="leftOut.merged.length > 0" :color="ColorIntent.INFO" class="gap-1">
            <span class="i-mdi-call-merge" aria-hidden="true" />
            <span aria-hidden="true">{{ leftOut.merged.length }}</span>
            <span class="sr-only">{{ t('review_merged_count', { n: leftOut.merged.length }) }}</span>
          </AppBadge>
        </TabsTrigger>
      </TabsList>

      <TabsContent :value="ReviewTab.INSTRUMENTS" class="overflow-x-auto">
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
                <button type="button" class="text-left rounded-sm hover:underline app-focus-ring">{{ row.name }}</button>
              </td>
              <td class="app-table-td font-mono text-xs"><span class="app-text-muted">{{ row.isin }}</span></td>
              <td class="app-table-td text-right">{{ row.stockTrades  }}</td>
              <td class="app-table-td text-right">{{ row.dividends  }}</td>
              <td class="app-table-td text-right">{{ row.derivatives  }}</td>
            </tr>
          </tbody>
        </table>
      </TabsContent>

      <TabsContent :value="ReviewTab.ISSUES">
        <ImportIssues :left-out="leftOut" />
      </TabsContent>
    </TabsRoot>

    <AppButton class="self-start" @click="emit('confirmed')">
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
