import type { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";

type TaxLotArgs<A, S> = {
	id: string;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: GenericShortLong;
	provenance: AnyProvenanceStep[];
};

export class TaxLot<A, S> {
	public readonly id: string;
	public readonly quantity: number;
	public readonly acquired: A;
	public readonly sold: S;
	public readonly shortLongType: GenericShortLong;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TaxLotArgs<A, S>) {
		this.id = args.id;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
		this.provenance = args.provenance;
	}

	copy(overrides: Partial<TaxLotArgs<A, S>>): TaxLot<A, S> {
		return new TaxLot<A, S>({
			id: this.id,
			quantity: this.quantity,
			acquired: this.acquired,
			sold: this.sold,
			shortLongType: this.shortLongType,
			provenance: this.provenance,
			...overrides,
		});
	}
}

export type TaxLotStock = TaxLot<TradeEventStockAcquired, TradeEventStockSold>;
export type TaxLotDerivative = TaxLot<TradeEventDerivativeAcquired, TradeEventDerivativeSold>;
