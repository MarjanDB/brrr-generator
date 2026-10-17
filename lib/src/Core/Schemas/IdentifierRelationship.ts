import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export enum IdentifierChangeType {
	RENAME = "RENAME",
	SPLIT = "SPLIT",
	REVERSE_SPLIT = "REVERSE_SPLIT",
}

type IdentifierRelationshipArgs = {
	fromIdentifier: FinancialIdentifier;
	toIdentifier: FinancialIdentifier;
	changeType: IdentifierChangeType;
	effectiveDate: ValidDateTime;
};

export class IdentifierRelationship {
	public readonly fromIdentifier: FinancialIdentifier;
	public readonly toIdentifier: FinancialIdentifier;
	public readonly changeType: IdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;

	constructor(args: IdentifierRelationshipArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}
}

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

export type IdentifierRelationshipAny = IdentifierRelationship | IdentifierRelationshipSplit;
