import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationship.ts";

export type FinancialEvents = {
	groupings: FinancialGrouping[];
	identifierRelationships: IdentifierRelationshipAny[];
};
