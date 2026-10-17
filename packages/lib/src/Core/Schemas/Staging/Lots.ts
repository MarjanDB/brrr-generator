import type { GenericShortLong } from "@brrr/Core/Schemas/CommonFormats";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export class StagingTaxLotMatchingDetails {
	public readonly id: string | null;
	public readonly dateTime: ValidDateTime | null;

	constructor(args: {
		id: string | null;
		dateTime: ValidDateTime | null;
	}) {
		this.id = args.id;
		this.dateTime = args.dateTime;
	}
}

export class StagingTaxLot {
	public readonly id: string;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly quantity: number;
	public readonly acquired: StagingTaxLotMatchingDetails;
	public readonly sold: StagingTaxLotMatchingDetails;
	public readonly shortLongType: GenericShortLong;

	constructor(args: {
		id: string;
		financialIdentifier: StagingFinancialIdentifier;
		quantity: number;
		acquired: StagingTaxLotMatchingDetails;
		sold: StagingTaxLotMatchingDetails;
		shortLongType: GenericShortLong;
	}) {
		this.id = args.id;
		this.financialIdentifier = args.financialIdentifier;
		this.quantity = args.quantity;
		this.acquired = args.acquired;
		this.sold = args.sold;
		this.shortLongType = args.shortLongType;
	}
}
