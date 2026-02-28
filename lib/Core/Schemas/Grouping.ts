import type { GenericCategory } from "./CommonFormats.ts";
import type { FinancialIdentifier } from "./FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "./Provenance.ts";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
	TransactionCash,
} from "./Events.ts";
import type { TaxLotDerivative, TaxLotStock } from "./Lots.ts";

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
