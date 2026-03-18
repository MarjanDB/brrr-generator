<script setup lang="ts">
import {
  type FinancialEvents,
  TradeEventCashTransactionDividend,
  TradeEventCashTransactionPaymentInLieuOfDividend,
  TradeEventCashTransactionWithholdingTax,
  TradeEventDerivativeAcquired,
  TradeEventStockAcquired,
} from "@brrr/lib";
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";

type Grouping = FinancialEvents["groupings"][number];

const props = defineProps<{
  name: string;
  isin: string;
  groupings: Grouping[];
}>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();

// Aggregate across all groupings (handles the ISIN-merge case)
const stockTrades = computed(() => props.groupings.flatMap((g) => g.stockTrades));
const cashTransactions = computed(() => props.groupings.flatMap((g) => g.cashTransactions));
const derivativeGroupings = computed(() => props.groupings.flatMap((g) => g.derivativeGroupings));

function formatDate(dt: { toFormat: (fmt: string) => string }) {
  return dt.toFormat("yyyy-MM-dd");
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

function cashTxLabel(tx: (typeof cashTransactions.value)[number]): string {
  if (tx instanceof TradeEventCashTransactionDividend) return t("modal_cash_dividend");
  if (tx instanceof TradeEventCashTransactionPaymentInLieuOfDividend) return t("modal_cash_payment_in_lieu");
  if (tx instanceof TradeEventCashTransactionWithholdingTax) return t("modal_cash_withholding_tax");
  return t("modal_cash_other");
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 app-overlay" />
      <DialogContent
        class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,760px)] max-h-[85vh] flex flex-col app-surface-overlay border app-border-strong rounded-lg shadow-xl overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 px-5 py-4 border-b app-border shrink-0">
          <div class="flex flex-col gap-0.5 min-w-0">
            <DialogTitle class="text-h5 truncate">{{ name }}</DialogTitle>
            <span class="text-caption font-mono">{{ isin }}</span>
          </div>
          <DialogClose class="button-ghost shrink-0 p-1">
            <span class="i-mdi-close text-lg block" />
          </DialogClose>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex flex-col gap-6 px-5 py-4">

          <!-- Stock trades -->
          <section v-if="stockTrades.length > 0">
            <h3 class="text-label mb-2">{{ t('modal_stock_trades_title') }}</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b app-border">
                    <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_date') }}</th>
                    <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_type') }}</th>
                    <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_qty') }}</th>
                    <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_price') }}</th>
                    <th class="text-right py-1.5 font-medium app-text-muted">{{ t('modal_col_total') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="trade in stockTrades"
                    :key="trade.id"
                    class="border-b app-border-subtle last:border-0"
                  >
                    <td class="py-1.5 pr-3 app-text font-mono text-xs">{{ formatDate(trade.date) }}</td>
                    <td class="py-1.5 pr-3 app-text text-xs">{{ trade instanceof TradeEventStockAcquired ? t('modal_trade_buy') : t('modal_trade_sell') }}</td>
                    <td class="py-1.5 pr-3 text-right app-text text-xs">{{ trade.exchangedMoney.underlyingQuantity }}</td>
                    <td class="py-1.5 pr-3 text-right app-text text-xs">{{ formatAmount(trade.exchangedMoney.underlyingTradePrice, trade.exchangedMoney.underlyingCurrency) }}</td>
                    <td class="py-1.5 text-right app-text text-xs">
                      {{ formatAmount(trade.exchangedMoney.underlyingQuantity * trade.exchangedMoney.underlyingTradePrice, trade.exchangedMoney.underlyingCurrency) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Cash transactions -->
          <section v-if="cashTransactions.length > 0">
            <h3 class="text-label mb-2">{{ t('modal_cash_transactions_title') }}</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b app-border">
                    <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_date') }}</th>
                    <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_type') }}</th>
                    <th class="text-right py-1.5 font-medium app-text-muted">{{ t('modal_col_amount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="tx in cashTransactions"
                    :key="tx.id"
                    class="border-b app-border-subtle last:border-0"
                  >
                    <td class="py-1.5 pr-3 app-text font-mono text-xs">{{ formatDate(tx.date) }}</td>
                    <td class="py-1.5 pr-3 app-text text-xs">{{ cashTxLabel(tx) }}</td>
                    <td class="py-1.5 text-right app-text text-xs">{{ formatAmount(tx.exchangedMoney.underlyingQuantity * tx.exchangedMoney.underlyingTradePrice, tx.exchangedMoney.underlyingCurrency) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Derivative contracts -->
          <section v-if="derivativeGroupings.length > 0">
            <h3 class="text-label mb-3">{{ t('modal_derivatives_title') }}</h3>
            <div class="flex flex-col gap-4">
              <div v-for="(dg, di) in derivativeGroupings" :key="di" class="flex flex-col gap-1.5">
                <div class="text-xs font-medium app-text-muted">
                  {{ dg.financialIdentifier.getTicker() ?? dg.financialIdentifier.getName() ?? dg.financialIdentifier.getIsin() ?? '—' }}
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b app-border">
                        <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_date') }}</th>
                        <th class="text-left py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_type') }}</th>
                        <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_qty') }}</th>
                        <th class="text-right py-1.5 pr-3 font-medium app-text-muted">{{ t('modal_col_price') }}</th>
                        <th class="text-right py-1.5 font-medium app-text-muted">{{ t('modal_col_total') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="trade in dg.derivativeTrades"
                        :key="trade.id"
                        class="border-b app-border-subtle last:border-0"
                      >
                        <td class="py-1.5 pr-3 app-text font-mono text-xs">{{ formatDate(trade.date) }}</td>
                        <td class="py-1.5 pr-3 app-text text-xs">{{ trade instanceof TradeEventDerivativeAcquired ? t('modal_trade_buy') : t('modal_trade_sell') }}</td>
                        <td class="py-1.5 pr-3 text-right app-text text-xs">{{ trade.exchangedMoney.underlyingQuantity }}</td>
                        <td class="py-1.5 pr-3 text-right app-text text-xs">{{ formatAmount(trade.exchangedMoney.underlyingTradePrice, trade.exchangedMoney.underlyingCurrency) }}</td>
                        <td class="py-1.5 text-right app-text text-xs">
                          {{ formatAmount(trade.exchangedMoney.underlyingQuantity * trade.exchangedMoney.underlyingTradePrice, trade.exchangedMoney.underlyingCurrency) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
