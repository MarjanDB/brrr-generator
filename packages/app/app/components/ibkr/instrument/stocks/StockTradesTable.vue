<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import { TradeEventStockAcquired } from "@brrr/lib";
import { useI18n } from 'vue-i18n';

type StockTrade = FinancialGrouping["stockTrades"][number];

defineProps<{
  trades: StockTrade[];
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
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b app-border">
          <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_date") }}</th>
          <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_type") }}</th>
          <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_qty") }}</th>
          <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_price") }}</th>
          <th class="text-right py-1.5 font-medium app-text-muted">{{ t("modal_col_total") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="trade in trades"
          :key="trade.id"
          class="border-b app-border-subtle last:border-0"
        >
          <td class="py-1.5 pr-3 app-text font-mono text-xs">{{ formatDate(trade.date) }}</td>
          <td class="py-1.5 pr-3 app-text text-xs">
            {{ trade instanceof TradeEventStockAcquired ? t("modal_trade_buy") : t("modal_trade_sell") }}
          </td>
          <td class="py-1.5 pr-3 text-right app-text text-xs">{{ trade.exchangedMoney.underlyingQuantity }}</td>
          <td class="py-1.5 pr-3 text-right app-text text-xs">
            {{ formatAmount(trade.exchangedMoney.underlyingTradePrice, trade.exchangedMoney.underlyingCurrency) }}
          </td>
          <td class="py-1.5 text-right app-text text-xs">
            {{
              formatAmount(
                trade.exchangedMoney.underlyingQuantity * trade.exchangedMoney.underlyingTradePrice,
                trade.exchangedMoney.underlyingCurrency,
              )
            }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
