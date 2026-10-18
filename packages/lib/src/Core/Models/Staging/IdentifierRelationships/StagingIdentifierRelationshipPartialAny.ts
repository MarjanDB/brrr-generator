import type { StagingIdentifierRelationshipPartial } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartial";
import type { StagingIdentifierRelationshipPartialWithQuantity } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialWithQuantity";

export type StagingIdentifierRelationshipPartialAny =
	| StagingIdentifierRelationshipPartial
	| StagingIdentifierRelationshipPartialWithQuantity;
