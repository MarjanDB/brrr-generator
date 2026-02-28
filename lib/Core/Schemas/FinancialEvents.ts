import type { FinancialGrouping } from "./Grouping.ts";
import type { IdentifierRelationshipAny } from "./IdentifierRelationship.ts";

export type FinancialEvents = {
	groupings: FinancialGrouping[];
	identifierRelationships: IdentifierRelationshipAny[];
};
