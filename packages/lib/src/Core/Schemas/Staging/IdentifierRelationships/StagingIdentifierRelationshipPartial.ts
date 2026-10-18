import type { CorrelationKey } from "@brrr/Core/Schemas/Identifiers";
import type { StagingIdentifierChangeType } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/Instrument/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type StagingIdentifierRelationshipPartialArgs = {
	fromIdentifier: StagingFinancialIdentifier | null;
	toIdentifier: StagingFinancialIdentifier | null;
	correlationKey: CorrelationKey;
	changeType: StagingIdentifierChangeType;
	effectiveDate: ValidDateTime;
	quantity?: number | null;
};

export class StagingIdentifierRelationshipPartial {
	public readonly fromIdentifier: StagingFinancialIdentifier | null;
	public readonly toIdentifier: StagingFinancialIdentifier | null;
	public readonly correlationKey: CorrelationKey;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;
	public readonly quantity?: number | null;

	constructor(args: StagingIdentifierRelationshipPartialArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.correlationKey = args.correlationKey;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantity = args.quantity;
	}
}
