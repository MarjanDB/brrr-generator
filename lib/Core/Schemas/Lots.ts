import type { GenericShortLong } from "./CommonFormats.ts";
import type { FinancialIdentifier } from "./FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "./Provenance.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold, TradeEventStockAcquired, TradeEventStockSold } from "./Events.ts";

export type TaxLot<A, S> = {
	id: string;
	financialIdentifier: FinancialIdentifier;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: GenericShortLong;
	provenance: AnyProvenanceStep[];
};

export type TaxLotStock = TaxLot<TradeEventStockAcquired, TradeEventStockSold>;

export type TaxLotDerivative = TaxLot<TradeEventDerivativeAcquired, TradeEventDerivativeSold>;
