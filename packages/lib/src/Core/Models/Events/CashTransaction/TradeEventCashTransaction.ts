import type { TradeEventCashTransactionDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionDividend";
import type { TradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionPaymentInLieuOfDividend";
import type { TradeEventCashTransactionWithholdingTax } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTax";
import type { TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Models/Events/CashTransaction/TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";

export type TradeEventCashTransaction =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionPaymentInLieuOfDividend
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;
