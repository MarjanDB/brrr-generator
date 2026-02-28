import type { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold, TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";

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
