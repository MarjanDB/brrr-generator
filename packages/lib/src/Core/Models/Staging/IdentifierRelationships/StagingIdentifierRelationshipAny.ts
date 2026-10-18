import type { StagingIdentifierRelationship } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import type { StagingIdentifierRelationshipSplit } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationshipSplit";

export type StagingIdentifierRelationshipAny =
	| StagingIdentifierRelationship
	| StagingIdentifierRelationshipSplit;
