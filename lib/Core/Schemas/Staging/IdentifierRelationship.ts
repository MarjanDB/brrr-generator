import type { DateTime } from "luxon";
import type { StagingFinancialIdentifier } from "@brrr/Core/Schemas/Staging/StagingFinancialIdentifier.ts";

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
	effectiveDate: DateTime | null;
};

export class StagingIdentifierRelationship {
	public readonly fromIdentifier: StagingFinancialIdentifier;
	public readonly toIdentifier: StagingFinancialIdentifier;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: DateTime | null;

	constructor(args: StagingIdentifierRelationshipArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingIdentifierRelationship>[0]>): StagingIdentifierRelationship {
		return new StagingIdentifierRelationship({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			...overrides,
		});
	}
}

export class StagingIdentifierRelationshipSplit {
	public readonly fromIdentifier: StagingFinancialIdentifier;
	public readonly toIdentifier: StagingFinancialIdentifier;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: DateTime | null;
	public readonly quantityBefore: number;
	public readonly quantityAfter: number;

	constructor(args: StagingIdentifierRelationshipArgs & { quantityBefore: number; quantityAfter: number }) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingIdentifierRelationshipSplit>[0]>): StagingIdentifierRelationshipSplit {
		return new StagingIdentifierRelationshipSplit({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			quantityBefore: this.quantityBefore,
			quantityAfter: this.quantityAfter,
			...overrides,
		});
	}
}

type StagingIdentifierRelationshipPartialArgs = {
	fromIdentifier: StagingFinancialIdentifier | null;
	toIdentifier: StagingFinancialIdentifier | null;
	correlationKey: string;
	changeType: StagingIdentifierChangeType;
	effectiveDate: DateTime;
	quantity?: number | null;
};

export class StagingIdentifierRelationshipPartial {
	public readonly fromIdentifier: StagingFinancialIdentifier | null;
	public readonly toIdentifier: StagingFinancialIdentifier | null;
	public readonly correlationKey: string;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: DateTime;
	public readonly quantity?: number | null;

	constructor(args: StagingIdentifierRelationshipPartialArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.correlationKey = args.correlationKey;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantity = args.quantity;
	}

	copy(overrides: Partial<ConstructorParameters<typeof StagingIdentifierRelationshipPartial>[0]>): StagingIdentifierRelationshipPartial {
		return new StagingIdentifierRelationshipPartial({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			correlationKey: this.correlationKey,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			quantity: this.quantity,
			...overrides,
		});
	}
}

export class StagingIdentifierRelationshipPartialWithQuantity {
	public readonly fromIdentifier: StagingFinancialIdentifier | null;
	public readonly toIdentifier: StagingFinancialIdentifier | null;
	public readonly correlationKey: string;
	public readonly changeType: StagingIdentifierChangeType;
	public readonly effectiveDate: DateTime;
	public readonly quantity: number;

	constructor(args: Omit<StagingIdentifierRelationshipPartialArgs, "quantity"> & { quantity: number }) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.correlationKey = args.correlationKey;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantity = args.quantity;
	}

	copy(
		overrides: Partial<ConstructorParameters<typeof StagingIdentifierRelationshipPartialWithQuantity>[0]>,
	): StagingIdentifierRelationshipPartialWithQuantity {
		return new StagingIdentifierRelationshipPartialWithQuantity({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			correlationKey: this.correlationKey,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			quantity: this.quantity,
			...overrides,
		});
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
