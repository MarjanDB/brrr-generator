import type { CorrelationKey } from "@brrr/Core/Schemas/Identifiers";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

export enum StagingIdentifierChangeType {
	RENAME = "RENAME",
	SPLIT = "SPLIT",
	REVERSE_SPLIT = "REVERSE_SPLIT",
	UNKNOWN = "UNKNOWN",
}

type StagingIdentifierRelationshipArgs = {
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

	constructor(args: StagingIdentifierRelationshipArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}
}

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

	constructor(args: StagingIdentifierRelationshipSplitArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
	}
}

type StagingIdentifierRelationshipPartialArgs = {
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

export type StagingIdentifierRelationshipPartialAny =
	| StagingIdentifierRelationshipPartial
	| StagingIdentifierRelationshipPartialWithQuantity;

export type StagingIdentifierRelationshipAny =
	| StagingIdentifierRelationship
	| StagingIdentifierRelationshipSplit;

export class StagingIdentifierRelationships {
	public readonly relationships: StagingIdentifierRelationshipAny[];
	public readonly partialRelationships: StagingIdentifierRelationshipPartialAny[];

	constructor(args: {
		relationships: StagingIdentifierRelationshipAny[];
		partialRelationships: StagingIdentifierRelationshipPartialAny[];
	}) {
		this.relationships = args.relationships;
		this.partialRelationships = args.partialRelationships;
	}
}
