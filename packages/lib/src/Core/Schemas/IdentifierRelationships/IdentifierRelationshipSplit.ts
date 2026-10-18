import type { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierChangeType";
import type { IdentifierRelationshipArgs } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationship";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/Instrument/FinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type IdentifierRelationshipSplitArgs = IdentifierRelationshipArgs & {
	quantityBefore: number;
	quantityAfter: number;
};

export class IdentifierRelationshipSplit {
	public readonly fromIdentifier: FinancialIdentifier;
	public readonly toIdentifier: FinancialIdentifier;
	public readonly changeType: IdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;
	public readonly quantityBefore: number;
	public readonly quantityAfter: number;

	constructor(args: IdentifierRelationshipSplitArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
	}
}
