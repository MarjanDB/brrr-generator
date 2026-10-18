import type { CorrelationKey } from "@brrr/Core/Schemas/Identifiers";
import type { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import type { StagingIdentifierRelationshipPartialArgs } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartial";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/Instrument/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type StagingIdentifierRelationshipPartialWithQuantityArgs = Omit<
	StagingIdentifierRelationshipPartialArgs,
	"quantity"
> & { quantity: number };

export class StagingIdentifierRelationshipPartialWithQuantity {
	public readonly fromIdentifier: StagingFinancialIdentifier | null;
	public readonly toIdentifier: StagingFinancialIdentifier | null;
	public readonly correlationKey: CorrelationKey;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;
	public readonly quantity: number;

	constructor(args: StagingIdentifierRelationshipPartialWithQuantityArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.correlationKey = args.correlationKey;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantity = args.quantity;
	}
}
