import type { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats.ts";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance.ts";
import type { TradeEventDerivativeAcquired, TradeEventDerivativeSold, TradeEventStockAcquired, TradeEventStockSold } from "@brrr/Core/Schemas/Events.ts";

type TaxLotArgs<A, S> = {
	id: string;
	financialIdentifier: FinancialIdentifier;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: GenericShortLong;
	provenance: AnyProvenanceStep[];
};

export class TaxLot<A, S> {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly quantity: number;
	public readonly acquired: A;
	public readonly sold: S;
	public readonly shortLongType: GenericShortLong;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TaxLotArgs<A, S>) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
		this.provenance = args.provenance;
	}

	copy(overrides: Partial<TaxLotArgs<A, S>>): TaxLot<A, S> {
		return new TaxLot<A, S>({
			id: this.id,
			financialIdentifier: this.financialIdentifier,
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
