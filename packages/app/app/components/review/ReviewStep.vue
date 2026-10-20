<script setup lang="ts">
import {
  type FinancialEvents,
  type FinancialGrouping,
  type ProvenanceGraph,
  TradeEventCashTransactionDividend,
} from "@brrr/lib";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { ref, shallowRef } from "vue";
import { CountNoun } from "~/types/counts";
import { IssueSeverity } from "~/types/ui";

const props = defineProps<{
  financialEvents: FinancialEvents;
  provenance: ProvenanceGraph;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const { t } = useI18n();
const { countText } = useCountText();

// Built once per import: where each imported row came from, for every row's popover below.
const sources = provideImportSources(() => props.provenance);
// What the import left out and counted once, for the Issues tab and its trigger's counts.
const leftOut = useImportLeftOut(() => props.provenance, sources);

enum ReviewTab {
  INSTRUMENTS = "INSTRUMENTS",
  ISSUES = "ISSUES",
}

// The Instruments tab opens first; its issue button switches to Issues.
const tab = ref(ReviewTab.INSTRUMENTS);
// Everything the Issues tab lists: what was left out, and what was counted once.
const issueCount = computed(() => leftOut.value.needsALook + leftOut.value.merged.length);

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
    <TabsRoot v-model="tab" class="flex flex-col gap-4">
      <TabsList :aria-label="t('review_tabs_label')" :class="TabClasses.list">
        <TabsTrigger :value="ReviewTab.INSTRUMENTS" :class="TabClasses.trigger">
          {{ t('review_tab_instruments') }}
          <AppBadge>{{ rows.length }}</AppBadge>
        </TabsTrigger>
        <TabsTrigger :value="ReviewTab.ISSUES" :class="TabClasses.trigger">
          {{ t('review_tab_issues') }}
          <AppBadge v-if="issueCount > 0">{{ issueCount }}</AppBadge>
        </TabsTrigger>
      </TabsList>

      <TabsContent :value="ReviewTab.INSTRUMENTS" class="flex flex-col gap-3 overflow-x-auto">
        <!-- What the import left out is on no form: seen here, before "Looks good, continue". -->
        <IssueButton
          v-if="leftOut.needsALook > 0"
          :severity="IssueSeverity.DANGER"
          class="self-start"
          @click="tab = ReviewTab.ISSUES"
        >
          {{ countText(CountNoun.ITEM_LEFT_OUT, leftOut.needsALook) }}
        </IssueButton>
        <table class="app-table">
          <thead>
            <tr class="app-table-head-row">
              <th class="app-table-th pl-3 text-left">{{ t('review_column_name') }}</th>
              <th class="app-table-th text-left">{{ t('review_column_isin') }}</th>
              <th class="app-table-th text-right">{{ t('review_column_stock_trades') }}</th>
              <th class="app-table-th text-right">{{ t('review_column_dividends') }}</th>
              <th class="app-table-th pr-3 text-right">{{ t('review_column_derivatives') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in rows"
              :key="row.isin || String(i)"
              class="app-table-row row-selectable"
              @click="openModal(row, $event)"
            >
              <td class="app-table-td pl-3">
                <button type="button" class="text-left rounded-sm hover:underline app-focus-ring">{{ row.name }}</button>
              </td>
              <td class="app-table-td text-ink-muted">{{ row.isin }}</td>
              <td class="app-table-td text-right">{{ row.stockTrades  }}</td>
              <td class="app-table-td text-right">{{ row.dividends  }}</td>
              <td class="app-table-td pr-3 text-right">{{ row.derivatives  }}</td>
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
