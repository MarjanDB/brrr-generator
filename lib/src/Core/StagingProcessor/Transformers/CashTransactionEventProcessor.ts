import {
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionPaymentInLieuOfDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend,
	type TransactionCash,
} from "@brrr/Core/Schemas/Events";
import { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import {
	StagingTradeEventCashTransactionDividend,
	StagingTradeEventCashTransactionPaymentInLieuOfDividends,
	StagingTradeEventCashTransactionWithholdingTax,
	type StagingTransactionCash,
} from "@brrr/Core/Schemas/Staging/Events";

export function processCashTransaction(input: StagingTransactionCash): TransactionCash {
	const identifier = FinancialIdentifier.fromStagingIdentifier(input.financialIdentifier);
	const base = {
		id: input.id,
		financialIdentifier: identifier,
		assetClass: input.assetClass,
		date: input.date,
		multiplier: input.multiplier,
		exchangedMoney: { ...input.exchangedMoney },
		actionId: input.actionId,
		transactionId: input.transactionId,
		provenance: [] as never[],
	};

	if (input instanceof StagingTradeEventCashTransactionDividend) {
		return new TradeEventCashTransactionDividend({
			...base,
			listingExchange: input.listingExchange,
			dividendType: input.dividendType,
		});
	} else if (input instanceof StagingTradeEventCashTransactionWithholdingTax) {
		return new TradeEventCashTransactionWithholdingTax({
			...base,
			listingExchange: input.listingExchange,
		});
	} else if (input instanceof StagingTradeEventCashTransactionPaymentInLieuOfDividends) {
		return new TradeEventCashTransactionPaymentInLieuOfDividend({
			...base,
			listingExchange: input.listingExchange,
			dividendType: input.dividendType,
		});
	} else {
		return new TradeEventCashTransactionWithholdingTaxForPaymentInLieuOfDividend({
			...base,
			listingExchange: input.listingExchange,
		});
	}
}
