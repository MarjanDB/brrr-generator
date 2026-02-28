import type { DateTime } from "luxon";
import type { StagingFinancialIdentifier } from "./StagingFinancialIdentifier.ts";

export enum StagingIdentifierChangeType {
	RENAME = "RENAME",
	SPLIT = "SPLIT",
	REVERSE_SPLIT = "REVERSE_SPLIT",
	UNKNOWN = "UNKNOWN",
}

export type StagingIdentifierRelationship = {
	fromIdentifier: StagingFinancialIdentifier;
	toIdentifier: StagingFinancialIdentifier;
	changeType: StagingIdentifierChangeType;
	effectiveDate: DateTime | null;
};

export type StagingIdentifierRelationshipSplit = {
	fromIdentifier: StagingFinancialIdentifier;
	toIdentifier: StagingFinancialIdentifier;
	changeType: StagingIdentifierChangeType;
	effectiveDate: DateTime | null;
	quantityBefore: number;
	quantityAfter: number;
};

export type StagingIdentifierRelationshipPartial = {
	fromIdentifier: StagingFinancialIdentifier | null;
	toIdentifier: StagingFinancialIdentifier | null;
	correlationKey: string;
	changeType: StagingIdentifierChangeType;
	effectiveDate: DateTime;
	quantity?: number | null;
};

export type StagingIdentifierRelationshipPartialWithQuantity = {
	fromIdentifier: StagingFinancialIdentifier | null;
	toIdentifier: StagingFinancialIdentifier | null;
	correlationKey: string;
	changeType: StagingIdentifierChangeType;
	effectiveDate: DateTime;
	quantity: number;
};

export type StagingIdentifierRelationshipPartialAny =
	| StagingIdentifierRelationshipPartial
	| StagingIdentifierRelationshipPartialWithQuantity;

export type StagingIdentifierRelationshipAny =
	| StagingIdentifierRelationship
	| StagingIdentifierRelationshipSplit;

export type StagingIdentifierRelationships = {
	relationships: StagingIdentifierRelationshipAny[];
	partialRelationships: StagingIdentifierRelationshipPartialAny[];
};
