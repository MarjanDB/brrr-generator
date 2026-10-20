<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import { TradeEventStockAcquired } from "@brrr/lib";
import { useI18n } from 'vue-i18n';
import { RowSourceKind } from "~/types/importSources";

type StockTrade = FinancialGrouping["stockTrades"][number];

defineProps<{
  trades: StockTrade[];
  baseCurrency: string;
}>();

const { t } = useI18n();

function formatDate(dt: { toFormat: (fmt: string) => string }) {
  return dt.toFormat("yyyy-MM-dd");
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="app-table">
      <thead>
        <tr class="app-table-head-row-dense">
          <th class="app-table-th-dense text-left">{{ t("modal_col_date") }}</th>
          <th class="app-table-th-dense text-left">{{ t("modal_col_type") }}</th>
          <th class="app-table-th-dense text-right">{{ t("modal_col_qty") }}</th>
          <th class="app-table-th-dense text-right">{{ t("modal_col_price") }}</th>
          <th class="app-table-th-dense text-right">{{ t("modal_col_total") }}</th>
          <th class="w-8 py-1.5 sticky right-0 bg-page"><span class="sr-only">{{ t("review_source_column") }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="trade in trades"
          :key="trade.id"
          class="app-table-row-dense"
        >
          <td class="app-table-td-dense tabular-nums">{{ formatDate(trade.date) }}</td>
          <td class="app-table-td-dense">
            {{ trade instanceof TradeEventStockAcquired ? t("modal_trade_buy") : t("modal_trade_sell") }}
          </td>
          <td class="app-table-td-dense text-right">{{ trade.exchangedMoney.quantity }}</td>
          <td class="app-table-td-dense text-right">
            {{ formatAmount(trade.exchangedMoney.priceInBase, baseCurrency) }}
          </td>
          <td class="app-table-td-dense text-right">
            {{ formatAmount(trade.exchangedMoney.quantity * trade.exchangedMoney.priceInBase, baseCurrency) }}
          </td>
          <td class="py-1 pl-2 text-right sticky right-0 bg-page">
            <RowSourceButton :subject="trade" :kind="RowSourceKind.TRADE" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
