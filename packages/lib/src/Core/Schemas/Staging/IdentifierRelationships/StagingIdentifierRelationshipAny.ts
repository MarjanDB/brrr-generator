import type { StagingIdentifierRelationship } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import type { StagingIdentifierRelationshipSplit } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";

export type StagingIdentifierRelationshipAny =
	| StagingIdentifierRelationship
	| StagingIdentifierRelationshipSplit;
