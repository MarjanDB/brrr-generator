import type { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierChangeType";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/Instrument/FinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export type ProvenanceStepArgs = {
	fromIdentifier: FinancialIdentifier;
	toIdentifier: FinancialIdentifier;
	changeType: IdentifierChangeType;
	effectiveDate: ValidDateTime;
};

export abstract class ProvenanceStepBase {
	public readonly fromIdentifier: FinancialIdentifier;
	public readonly toIdentifier: FinancialIdentifier;
	public readonly changeType: IdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;

	constructor(args: ProvenanceStepArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}
}
