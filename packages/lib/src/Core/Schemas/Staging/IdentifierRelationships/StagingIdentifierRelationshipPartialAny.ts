import type { StagingIdentifierRelationshipPartial } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartial";
import type { StagingIdentifierRelationshipPartialWithQuantity } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialWithQuantity";

export type StagingIdentifierRelationshipPartialAny =
	| StagingIdentifierRelationshipPartial
	| StagingIdentifierRelationshipPartialWithQuantity;
