import type { DateTime } from "luxon";
import type {
  GenericAssetClass,
  GenericDerivativeReportItemGainType,
  GenericDividendType,
  GenericMonetaryExchangeInformation,
  GenericTradeReportItemGainType,
} from "./CommonFormats.ts";
import type { FinancialIdentifier } from "./FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "./Provenance.ts";

export type TradeEvent = {
  id: string;
  financialIdentifier: FinancialIdentifier;
  assetClass: GenericAssetClass;
  date: DateTime;
  multiplier: number;
  exchangedMoney: GenericMonetaryExchangeInformation;
  provenance: AnyProvenanceStep[];
};

export type TradeEventStockAcquired = TradeEvent & {
  kind: "StockAcquired";
  acquiredReason: GenericTradeReportItemGainType;
};

export type TradeEventStockSold = TradeEvent & {
  kind: "StockSold";
};

export type TradeEventStock = TradeEventStockAcquired | TradeEventStockSold;

export type TradeEventDerivativeAcquired = TradeEvent & {
  kind: "DerivativeAcquired";
  acquiredReason: GenericDerivativeReportItemGainType;
};

export type TradeEventDerivativeSold = TradeEvent & {
  kind: "DerivativeSold";
};

export type TradeEventDerivative = TradeEventDerivativeAcquired | TradeEventDerivativeSold;

export type TradeEventCashTransaction = TradeEvent & {
  actionId: string;
  transactionId: string;
};

export type TradeEventCashTransactionDividend = TradeEventCashTransaction & {
  kind: "CashTransactionDividend";
  listingExchange: string;
  dividendType: GenericDividendType;
};

export type TradeEventCashTransactionPaymentInLieuOfDividend = TradeEventCashTransaction & {
  kind: "CashTransactionPaymentInLieuOfDividend";
  listingExchange: string;
  dividendType: GenericDividendType;
};

export type TradeEventCashTransactionWithholdingTax = TradeEventCashTransaction & {
  kind: "CashTransactionWithholdingTax";
  listingExchange: string;
};

export type TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend = TradeEventCashTransaction & {
  kind: "CashTransactionWithholdingTaxForPaymentInLieuOfDividend";
  listingExchange: string;
};

export type TransactionCash =
  | TradeEventCashTransactionDividend
  | TradeEventCashTransactionWithholdingTax
  | TradeEventCashTransactionPaymentInLieuOfDividend
  | TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;
