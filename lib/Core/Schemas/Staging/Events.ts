import type { DateTime } from "luxon";
import type {
	GenericAssetClass,
	GenericDerivativeReportItemGainType,
	GenericDividendType,
	GenericMonetaryExchangeInformation,
	GenericTradeReportItemGainType,
} from "@brrr/Core/Schemas/CommonFormats.ts";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";

export type StagingTradeEvent = {
	id: string;
	financialIdentifier: StagingFinancialIdentifier;
	assetClass: GenericAssetClass;
	date: DateTime;
	multiplier: number;
	exchangedMoney: GenericMonetaryExchangeInformation;
};

export type StagingTradeEventStockAcquired = StagingTradeEvent & {
	kind: "StagingStockAcquired";
	acquiredReason: GenericTradeReportItemGainType;
};

export type StagingTradeEventStockSold = StagingTradeEvent & {
	kind: "StagingStockSold";
};

export type StagingTradeEventStock = StagingTradeEventStockAcquired | StagingTradeEventStockSold;

export type StagingTradeEventDerivativeAcquired = StagingTradeEvent & {
	kind: "StagingDerivativeAcquired";
	acquiredReason: GenericDerivativeReportItemGainType;
};

export type StagingTradeEventDerivativeSold = StagingTradeEvent & {
	kind: "StagingDerivativeSold";
};

export type StagingTradeEventDerivative =
	| StagingTradeEventDerivativeAcquired
	| StagingTradeEventDerivativeSold;

export type StagingTradeEventCashTransaction = StagingTradeEvent & {
	actionId: string;
	transactionId: string;
	listingExchange: string;
};

export type StagingTradeEventCashTransactionDividend = StagingTradeEventCashTransaction & {
	kind: "StagingCashTransactionDividend";
	dividendType: GenericDividendType;
};

export type StagingTradeEventCashTransactionWithholdingTax = StagingTradeEventCashTransaction & {
	kind: "StagingCashTransactionWithholdingTax";
};

export type StagingTradeEventCashTransactionPaymentInLieuOfDividends = StagingTradeEventCashTransaction & {
	kind: "StagingCashTransactionPaymentInLieuOfDividends";
	dividendType: GenericDividendType;
};

export type StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends = StagingTradeEventCashTransaction & {
	kind: "StagingCashTransactionWithholdingTaxForPaymentInLieuOfDividends";
};

export type StagingTransactionCash =
	| StagingTradeEventCashTransactionDividend
	| StagingTradeEventCashTransactionWithholdingTax
	| StagingTradeEventCashTransactionPaymentInLieuOfDividends
	| StagingTradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividends;
