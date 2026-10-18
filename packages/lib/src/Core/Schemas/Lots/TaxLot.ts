import type { TradeEventDerivativeAcquired } from "@brrr/Core/Schemas/Events/Derivative/TradeEventDerivativeAcquired";
import type { TradeEventDerivativeSold } from "@brrr/Core/Schemas/Events/Derivative/TradeEventDerivativeSold";
import type { TradeEventStockAcquired } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockAcquired";
import type { TradeEventStockSold } from "@brrr/Core/Schemas/Events/Stock/TradeEventStockSold";
import type { TaxLotId } from "@brrr/Core/Schemas/Identifiers";
import type { ShortLong } from "@brrr/Core/Schemas/Lots/ShortLong";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance/AnyProvenanceStep";

type TaxLotArgs<A, S> = {
	id: TaxLotId;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: ShortLong;
	provenance: AnyProvenanceStep[];
};

// The sides are named by direction, not by which one opens the position: on a short lot the sale
// comes first and opens it, and `acquired` is the later buy that closes it.
export class TaxLot<A, S> {
	public readonly id: TaxLotId;
	public readonly quantity: number;
	public readonly acquired: A;
	public readonly sold: S;
	public readonly shortLongType: ShortLong;
	public readonly provenance: AnyProvenanceStep[];

	public constructor(args: TaxLotArgs<A, S>) {
		this.id = args.id;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
		this.provenance = args.provenance;
	}
}

export type TaxLotStock = TaxLot<TradeEventStockAcquired, TradeEventStockSold>;

export type TaxLotDerivative = TaxLot<TradeEventDerivativeAcquired, TradeEventDerivativeSold>;
