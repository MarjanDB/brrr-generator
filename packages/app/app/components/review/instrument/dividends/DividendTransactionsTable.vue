<script setup lang="ts">
import type { FinancialGrouping } from "@brrr/lib";
import {
  TradeEventCashTransactionDividend,
  TradeEventCashTransactionPaymentInLieuOfDividend,
  TradeEventCashTransactionWithholdingTax,
} from "@brrr/lib";
import { useI18n } from 'vue-i18n';
import { RowSourceKind } from "~/types/importSources";

type CashTx = FinancialGrouping["cashTransactions"][number];

defineProps<{
  transactions: CashTx[];
  baseCurrency: string;
}>();

const { t } = useI18n();

function formatDate(dt: { toFormat: (fmt: string) => string }) {
  return dt.toFormat("yyyy-MM-dd");
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

function cashTxLabel(tx: CashTx): string {
  if (tx instanceof TradeEventCashTransactionDividend) return t("modal_cash_dividend");
  if (tx instanceof TradeEventCashTransactionPaymentInLieuOfDividend) return t("modal_cash_payment_in_lieu");
  if (tx instanceof TradeEventCashTransactionWithholdingTax) return t("modal_cash_withholding_tax");
  return t("modal_cash_other");
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b app-border">
          <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_date") }}</th>
          <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_type") }}</th>
          <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t("modal_col_amount") }}</th>
          <th class="w-8 py-1.5 sticky right-0 bg-page"><span class="sr-only">{{ t("review_source_column") }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="tx in transactions"
          :key="tx.id"
          class="border-b app-border-subtle last:border-0"
        >
          <td class="py-1.5 pr-3 app-text font-mono text-xs">{{ formatDate(tx.date) }}</td>
          <td class="py-1.5 pr-3 app-text text-xs">{{ cashTxLabel(tx) }}</td>
          <td class="py-1.5 pr-3 text-right app-text text-xs">
            {{ formatAmount(tx.exchangedMoney.quantity * tx.exchangedMoney.priceInBase, baseCurrency) }}
          </td>
          <td class="py-1 pl-2 text-right sticky right-0 bg-page">
            <RowSourceButton :subject="tx" :kind="RowSourceKind.CASH_TRANSACTION" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
