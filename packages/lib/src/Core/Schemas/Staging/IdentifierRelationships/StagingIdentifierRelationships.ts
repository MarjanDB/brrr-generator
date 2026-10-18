import type { StagingIdentifierRelationshipAny } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipAny";
import type { StagingIdentifierRelationshipPartialAny } from "@brrr/Core/Schemas/Staging/IdentifierRelationships/StagingIdentifierRelationshipPartialAny";

export class StagingIdentifierRelationships {
	public readonly relationships: StagingIdentifierRelationshipAny[];
	public readonly partialRelationships: StagingIdentifierRelationshipPartialAny[];

	public constructor(args: {
		relationships: StagingIdentifierRelationshipAny[];
		partialRelationships: StagingIdentifierRelationshipPartialAny[];
	}) {
		this.relationships = args.relationships;
		this.partialRelationships = args.partialRelationships;
	}
}
