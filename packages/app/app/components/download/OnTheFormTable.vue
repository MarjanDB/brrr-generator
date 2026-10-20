<script setup lang="ts">
import { ReportInstrumentKind } from "@brrr/lib";
import { computed } from "vue";

// The "On the form" tab: the lots on the form with the form's own figures (prices per unit and the
// net change, in the base currency, and their total), or a dividend payer's payments on it. A click
// on a row moves the focus to its item; its Trace button opens the item's trace.
const { t } = useI18n();
const card = useInstrumentCard();
const {
	focus,
	formLots,
	formTotal,
	formPayments,
	describeHeld,
	describeWhat,
	describeNode,
	showTrace,
} = card;
const { nodeDate, nodeQuantity, nodeAmount, formPrice, formChange } = useProvenanceText();

const isPayer = card.entry.kind === ReportInstrumentKind.DIVIDEND_PAYER;
const lit = computed(() => focus.lit.value?.sources ?? null);
const empty = computed(() =>
	isPayer ? formPayments.value.length === 0 : formLots.value.length === 0,
);

// A gain in the success colour, a loss in the danger colour.
function changeClass(value: number | null): string {
	if (value === null || value === 0) {
		return "";
	}
	return value > 0 ? "text-success-ink" : "text-danger-ink";
}
</script>

<template>
  <InstrumentTableFrame>
    <p v-if="empty" class="px-3 py-3 text-sm text-ink-muted">
      {{ t('download_on_the_form_empty', { name: card.name }) }}
    </p>
    <table v-else-if="isPayer" class="app-table tabular-nums">
      <thead class="sticky top-0 z-10 bg-surface">
        <tr class="app-table-head-row text-left">
          <th class="app-table-th pl-3 whitespace-nowrap">{{ t('download_fact_date') }}</th>
          <th class="app-table-th whitespace-nowrap">{{ t('download_col_what') }}</th>
          <th class="app-table-th text-right whitespace-nowrap">{{ t('download_fact_amount') }}</th>
          <th class="app-table-th pr-3 text-right whitespace-nowrap">{{ t('download_tab_trace') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="mark in formPayments"
          :key="mark.node.id"
          class="app-table-row row-selectable"
          v-bind="rowStateAttributes(markStateOf(mark.node, focus.node.value, lit))"
          @click="focus.refocus(mark.node)"
        >
          <td class="app-table-td pl-3 whitespace-nowrap">{{ nodeDate(mark.node) }}</td>
          <td class="app-table-td">{{ describeWhat(mark) }}</td>
          <td class="app-table-td text-right whitespace-nowrap">{{ nodeAmount(mark.node) }}</td>
          <td class="app-table-td pr-3 text-right">
            <TraceButton :what="describeNode(mark.node)" @trace="showTrace(mark.node)" />
          </td>
        </tr>
      </tbody>
    </table>
    <table v-else class="app-table tabular-nums">
      <thead class="sticky top-0 z-10 bg-surface">
        <tr class="app-table-head-row text-left">
          <th class="app-table-th pl-3 whitespace-nowrap">{{ t('download_col_bought') }}</th>
          <th class="app-table-th text-right whitespace-nowrap">{{ t('download_fact_quantity') }}</th>
          <th class="app-table-th text-right whitespace-nowrap">{{ t('download_col_buy_price') }}</th>
          <th class="app-table-th whitespace-nowrap">{{ t('download_col_sold') }}</th>
          <th class="app-table-th text-right whitespace-nowrap">{{ t('download_col_sell_price') }}</th>
          <th class="app-table-th whitespace-nowrap">{{ t('download_col_held') }}</th>
          <th class="app-table-th text-right whitespace-nowrap">{{ t('download_col_net_change') }}</th>
          <th class="app-table-th pr-3 text-right whitespace-nowrap">{{ t('download_tab_trace') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in formLots"
          :key="row.lot.id"
          class="app-table-row row-selectable"
          v-bind="rowStateAttributes(barStateOf(row.bar, focus.node.value, lit))"
          @click="focus.refocus(row.lot)"
        >
          <td class="app-table-td pl-3 whitespace-nowrap">{{ nodeDate(row.bought.node) }}</td>
          <td class="app-table-td text-right">{{ nodeQuantity(row.lot) }}</td>
          <td class="app-table-td text-right whitespace-nowrap">
            {{ row.boughtPrice === null ? '' : formPrice(row.boughtPrice) }}
          </td>
          <td class="app-table-td whitespace-nowrap">{{ nodeDate(row.sold.node) }}</td>
          <td class="app-table-td text-right whitespace-nowrap">
            {{ row.soldPrice === null ? '' : formPrice(row.soldPrice) }}
          </td>
          <td class="app-table-td whitespace-nowrap">{{ describeHeld(row.bar) }}</td>
          <td class="app-table-td text-right whitespace-nowrap" :class="changeClass(row.netChange)">
            {{ row.netChange === null ? '' : formChange(row.netChange) }}
          </td>
          <td class="app-table-td pr-3 text-right">
            <TraceButton :what="describeNode(row.lot)" @trace="showTrace(row.lot)" />
          </td>
        </tr>
      </tbody>
      <tfoot class="sticky bottom-0 z-10 bg-surface">
        <tr class="border-t app-border-strong font-medium">
          <td class="app-table-td pl-3" colspan="6">{{ t('download_form_total') }}</td>
          <td class="app-table-td text-right whitespace-nowrap" :class="changeClass(formTotal)">
            {{ formChange(formTotal) }}
          </td>
          <td class="app-table-td" />
        </tr>
      </tfoot>
    </table>
  </InstrumentTableFrame>
</template>
