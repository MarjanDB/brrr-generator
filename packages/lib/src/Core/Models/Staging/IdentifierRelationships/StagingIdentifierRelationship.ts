import type { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import type { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type StagingIdentifierRelationshipArgs = {
	fromIdentifier: StagingFinancialIdentifier;
	toIdentifier: StagingFinancialIdentifier;
	changeType: StagingIdentifierChangeType;
	effectiveDate: ValidDateTime | null;
};

export class StagingIdentifierRelationship {
	public readonly fromIdentifier: StagingFinancialIdentifier;
	public readonly toIdentifier: StagingFinancialIdentifier;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: ValidDateTime | null;

	public constructor(args: StagingIdentifierRelationshipArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}
}
