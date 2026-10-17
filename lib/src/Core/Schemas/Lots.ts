import type { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import type {
	TradeEventDerivativeAcquired,
	TradeEventDerivativeSold,
	TradeEventStockAcquired,
	TradeEventStockSold,
} from "@brrr/Core/Schemas/Events";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { AnyProvenanceStep } from "@brrr/Core/Schemas/Provenance";
import { Model } from "@brrr/Utils/Model";

type TaxLotArgs<A, S> = {
	id: string;
	financialIdentifier: FinancialIdentifier;
	quantity: number;
	acquired: A;
	sold: S;
	shortLongType: GenericShortLong;
	provenance: AnyProvenanceStep[];
};

export class TaxLot<A, S> extends Model<TaxLotArgs<A, S>> {
	public readonly id: string;
	public readonly financialIdentifier: FinancialIdentifier;
	public readonly quantity: number;
	public readonly acquired: A;
	public readonly sold: S;
	public readonly shortLongType: GenericShortLong;
	public readonly provenance: AnyProvenanceStep[];

	constructor(args: TaxLotArgs<A, S>) {
		super();
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
		this.provenance = args.provenance;
	}
}

export type TaxLotStock = TaxLot<TradeEventStockAcquired, TradeEventStockSold>;
export type TaxLotDerivative = TaxLot<TradeEventDerivativeAcquired, TradeEventDerivativeSold>;
