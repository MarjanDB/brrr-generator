import type { ShortLong } from "@brrr/Core/Schemas/CommonFormats";
import type { TaxLotId, TradeEventId } from "@brrr/Core/Schemas/Identifiers";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export class StagingTaxLotMatchingDetails {
	public readonly id: TradeEventId | null;
	public readonly dateTime: ValidDateTime | null;

	constructor(args: {
		id: TradeEventId | null;
		dateTime: ValidDateTime | null;
	}) {
		this.id = args.id;
		this.dateTime = args.dateTime;
	}
}

export class StagingTaxLot {
	public readonly id: TaxLotId;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly quantity: number;
	public readonly acquired: StagingTaxLotMatchingDetails;
	public readonly sold: StagingTaxLotMatchingDetails;
	public readonly shortLongType: ShortLong;

	constructor(args: {
		id: TaxLotId;
		financialIdentifier: StagingFinancialIdentifier;
		quantity: number;
		acquired: StagingTaxLotMatchingDetails;
		sold: StagingTaxLotMatchingDetails;
		shortLongType: ShortLong;
	}) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
	}
}
