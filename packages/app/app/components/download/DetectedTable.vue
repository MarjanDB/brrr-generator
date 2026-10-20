<script setup lang="ts">
import { ReportInstrumentKind } from "@brrr/lib";
import { computed } from "vue";
import { DetectedReason } from "~/types/instrumentCard";
import { ColorIntent } from "~/types/ui";

// The "Everything detected" tab: every trade, payment, broker lot and corporate action of the
// instrument by date, with its tax treatment: reported on the form, or excluded and why (a lot
// closed outside the tax year, a position still open, a payment of another year, the report's own
// reason), and for a corporate action whether it applies to the form's lots. A click on a row moves
// the focus to its item; its Trace button opens the trace.
const { t } = useI18n();
const card = useInstrumentCard();
const { focus, timeline, detected, describeWhat, describeNode, describeParts, showTrace } = card;
const { nodeDate, nodeQuantity, nodePrice, nodeAmount } = useProvenanceText();

const isPayer = card.entry.kind === ReportInstrumentKind.DIVIDEND_PAYER;
const lit = computed(() => focus.lit.value?.sources ?? null);

// The form's own colour for what is on it or applies to it, grey for what is excluded or changes
// nothing.
const verdictColors: Record<DetectedReason, ColorIntent> = {
	[DetectedReason.REPORTED]: ColorIntent.ACCENT,
	[DetectedReason.APPLIED]: ColorIntent.ACCENT,
	[DetectedReason.CLOSED_BEFORE_YEAR]: ColorIntent.NEUTRAL,
	[DetectedReason.CLOSED_AFTER_YEAR]: ColorIntent.NEUTRAL,
	[DetectedReason.STILL_OPEN]: ColorIntent.NEUTRAL,
	[DetectedReason.PAID_OUTSIDE_YEAR]: ColorIntent.NEUTRAL,
	[DetectedReason.LEFT_OUT]: ColorIntent.NEUTRAL,
	[DetectedReason.NO_EFFECT]: ColorIntent.NEUTRAL,
};
</script>

<template>
  <InstrumentTableFrame>
    <table class="app-table tabular-nums">
      <thead class="sticky top-0 z-10 bg-surface">
        <tr class="app-table-head-row text-left">
          <th class="app-table-th pl-3 whitespace-nowrap">{{ t('download_fact_date') }}</th>
          <th class="app-table-th whitespace-nowrap">{{ t('download_col_what') }}</th>
          <template v-if="isPayer">
            <th class="app-table-th text-right whitespace-nowrap">{{ t('download_fact_amount') }}</th>
          </template>
          <template v-else>
            <th class="app-table-th text-right whitespace-nowrap">{{ t('download_fact_quantity') }}</th>
            <th class="app-table-th text-right whitespace-nowrap">{{ t('download_fact_price') }}</th>
          </template>
          <th class="app-table-th whitespace-nowrap">{{ t('download_col_status') }}</th>
          <th class="app-table-th pr-3 text-right whitespace-nowrap">{{ t('download_tab_trace') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in detected"
          :key="row.mark.node.id"
          class="app-table-row row-selectable"
          v-bind="rowStateAttributes(detectedRowStateOf(row.mark, timeline, focus.node.value, lit))"
          @click="focus.refocus(row.mark.node)"
        >
          <td class="app-table-td pl-3 whitespace-nowrap">{{ nodeDate(row.mark.node) }}</td>
          <td class="app-table-td">{{ describeWhat(row.mark) }}</td>
          <template v-if="isPayer">
            <td class="app-table-td text-right whitespace-nowrap">{{ nodeAmount(row.mark.node) }}</td>
          </template>
          <template v-else>
            <td class="app-table-td text-right">{{ nodeQuantity(row.mark.node) }}</td>
            <td class="app-table-td text-right whitespace-nowrap">{{ nodePrice(row.mark.node) }}</td>
          </template>
          <td class="app-table-td">
            <p
              v-for="(part, index) in describeParts(row)"
              :key="index"
              class="flex items-baseline gap-2"
              :class="{ 'mt-1': index > 0 }"
            >
              <AppBadge :color="verdictColors[part.reason]" pill class="shrink-0">{{ part.verdict }}</AppBadge>
              <span class="text-ink-muted">{{ part.detail }}</span>
            </p>
          </td>
          <td class="app-table-td pr-3 text-right">
            <TraceButton :what="describeNode(row.mark.node)" @trace="showTrace(row.mark.node)" />
          </td>
        </tr>
      </tbody>
    </table>
  </InstrumentTableFrame>
</template>
