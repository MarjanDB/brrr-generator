import { FinancialIdentifier } from "@brrr/core/schemas/FinancialIdentifier.ts";
import type { TransactionCash } from "@brrr/core/schemas/Events.ts";
import type { StagingTransactionCash } from "@brrr/core/schemas/staging/Events.ts";

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

	switch (input.kind) {
		case "StagingCashTransactionDividend":
			return {
				...base,
				kind: "CashTransactionDividend",
				listingExchange: input.listingExchange,
				dividendType: input.dividendType,
			};
		case "StagingCashTransactionWithholdingTax":
			return {
				...base,
				kind: "CashTransactionWithholdingTax",
				listingExchange: input.listingExchange,
			};
		case "StagingCashTransactionPaymentInLieuOfDividends":
			return {
				...base,
				kind: "CashTransactionPaymentInLieuOfDividend",
				listingExchange: input.listingExchange,
				dividendType: input.dividendType,
			};
		case "StagingCashTransactionWithholdingTaxForPaymentInLieuOfDividends":
			return {
				...base,
				kind: "CashTransactionWithholdingTaxForPaymentInLieuOfDividend",
				listingExchange: input.listingExchange,
			};
	}
}
