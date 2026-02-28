import type { GenericCategory } from "@brrr/Core/Schemas/CommonFormats.ts";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";
import type { StagingTradeEventDerivative, StagingTradeEventStock, StagingTransactionCash } from "@brrr/Core/Schemas/Staging/Events.ts";
import type { StagingTaxLot } from "@brrr/Core/Schemas/Staging/Lots.ts";

export type StagingFinancialGrouping = {
	financialIdentifier: StagingFinancialIdentifier;
	countryOfOrigin: string | null;

	underlyingCategory: GenericCategory;

	stockTrades: StagingTradeEventStock[];
	stockTaxLots: StagingTaxLot[];

	derivativeTrades: StagingTradeEventDerivative[];
	derivativeTaxLots: StagingTaxLot[];

	cashTransactions: StagingTransactionCash[];
};
