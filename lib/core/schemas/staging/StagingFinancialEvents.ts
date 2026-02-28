import type { StagingFinancialGrouping } from "./Grouping.ts";
import type { StagingIdentifierRelationships } from "./IdentifierRelationship.ts";

export type StagingFinancialEvents = {
	groupings: StagingFinancialGrouping[];
	identifierRelationships: StagingIdentifierRelationships;
};
