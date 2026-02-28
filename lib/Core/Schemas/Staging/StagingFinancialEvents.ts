import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping.ts";
import type { StagingIdentifierRelationships } from "@brrr/Core/Schemas/Staging/IdentifierRelationship.ts";

export type StagingFinancialEvents = {
	groupings: StagingFinancialGrouping[];
	identifierRelationships: StagingIdentifierRelationships;
};
