import type { DateTime } from "luxon";
import type { FinancialIdentifier } from "./FinancialIdentifier.ts";

export enum IdentifierChangeType {
  RENAME = "RENAME",
  SPLIT = "SPLIT",
  REVERSE_SPLIT = "REVERSE_SPLIT",
}

export type IdentifierRelationship = {
  fromIdentifier: FinancialIdentifier;
  toIdentifier: FinancialIdentifier;
  changeType: IdentifierChangeType;
  effectiveDate: DateTime;
};

export type IdentifierRelationshipSplit = IdentifierRelationship & {
  quantityBefore: number;
  quantityAfter: number;
};

export type IdentifierRelationshipAny = IdentifierRelationship | IdentifierRelationshipSplit;
