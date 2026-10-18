import type { TradeEventCashTransactionDividend } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransactionDividend";
import type { TradeEventCashTransactionPaymentInLieuOfDividend } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransactionPaymentInLieuOfDividend";
import type { TradeEventCashTransactionWithholdingTax } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransactionWithholdingTax";
import type { TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend } from "@brrr/Core/Schemas/Events/CashTransaction/TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend";

export type TradeEventCashTransaction =
	| TradeEventCashTransactionDividend
	| TradeEventCashTransactionWithholdingTax
	| TradeEventCashTransactionPaymentInLieuOfDividend
	| TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend;
