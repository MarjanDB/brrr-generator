import type { GenericCategory } from "@brrr/Core/Schemas/CommonFormats.ts";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance.ts";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
	TransactionCash,
} from "@brrr/Core/Schemas/Events.ts";
import type { TaxLotDerivative, TaxLotStock } from "@brrr/Core/Schemas/Lots.ts";

export type DerivativeGrouping = {
	financialIdentifier: FinancialIdentifier;
	derivativeTrades: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[];
	derivativeTaxLots: TaxLotDerivative[];
	provenance: AnyProvenanceStep[];
};

export type FinancialGrouping = {
	financialIdentifier: FinancialIdentifier;
	countryOfOrigin: string | null;

	underlyingCategory: GenericCategory;

	stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[];
	stockTaxLots: TaxLotStock[];

	derivativeGroupings: DerivativeGrouping[];

	cashTransactions: TransactionCash[];
	provenance: AnyProvenanceStep[];
};

export type UnderlyingDerivativeGrouping = {
	financialIdentifier: FinancialIdentifier;
	derivativeTrades: (TradeEventDerivativeAcquired | TradeEventDerivativeSold)[];
};

export type UnderlyingGroupingWithTradesOfInterest = {
	financialIdentifier: FinancialIdentifier;
	countryOfOrigin: string | null;

	underlyingCategory: GenericCategory;

	stockTrades: (TradeEventStockAcquired | TradeEventStockSold)[];

	derivativeGroupings: UnderlyingDerivativeGrouping[];

	cashTransactions: TransactionCash[];
};
