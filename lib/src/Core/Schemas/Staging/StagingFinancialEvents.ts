import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
import type { StagingIdentifierRelationships } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";

export class StagingFinancialEvents {
	public readonly groupings: StagingFinancialGrouping[];
	public readonly identifierRelationships: StagingIdentifierRelationships;

	constructor(args: {
		groupings: StagingFinancialGrouping[];
		identifierRelationships: StagingIdentifierRelationships;
	}) {
		this.groupings = args.groupings;
		this.identifierRelationships = args.identifierRelationships;
	}
}
