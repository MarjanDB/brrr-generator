import type { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import type { StagingIdentifierRelationshipArgs } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import type { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type StagingIdentifierRelationshipSplitArgs = StagingIdentifierRelationshipArgs & {
	quantityBefore: number;
	quantityAfter: number;
};

export class StagingIdentifierRelationshipSplit {
	public readonly fromIdentifier: StagingFinancialIdentifier;
	public readonly toIdentifier: StagingFinancialIdentifier;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: ValidDateTime | null;
	public readonly quantityBefore: number;
	public readonly quantityAfter: number;

	public constructor(args: StagingIdentifierRelationshipSplitArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
	}
}
