import type { TaxLotId } from "@brrr/Core/Schemas/Identifiers";
import type { ShortLong } from "@brrr/Core/Schemas/Lots/ShortLong";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/Instrument/StagingFinancialIdentifier";
import type { StagingTaxLotMatchingDetails } from "@brrr/Core/Schemas/Staging/Lots/StagingTaxLotMatchingDetails";

export class StagingTaxLot {
	public readonly id: TaxLotId;
	public readonly financialIdentifier: StagingFinancialIdentifier;
	public readonly quantity: number;
	public readonly acquired: StagingTaxLotMatchingDetails;
	public readonly sold: StagingTaxLotMatchingDetails;
	public readonly shortLongType: ShortLong;

	public constructor(args: {
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
