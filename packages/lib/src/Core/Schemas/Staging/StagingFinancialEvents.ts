import type { StagingFinancialGrouping } from "@brrr/Core/Schemas/Staging/Grouping";
import { StagingIdentifierRelationships } from "@brrr/Core/Schemas/Staging/IdentifierRelationship";

export class StagingFinancialEvents {
	public readonly groupings: StagingFinancialGrouping[];
	public readonly identifierRelationships: StagingIdentifierRelationships;

	public static merge(eventsList: StagingFinancialEvents[]): StagingFinancialEvents {
		const groupings = eventsList.flatMap((e) => e.groupings);
		const relationships = eventsList.flatMap((e) => e.identifierRelationships.relationships);
		const partialRelationships = eventsList.flatMap(
			(e) => e.identifierRelationships.partialRelationships,
		);

		return new StagingFinancialEvents({
			groupings,
			identifierRelationships: new StagingIdentifierRelationships({
				relationships,
				partialRelationships,
			}),
		});
	}

	constructor(args: {
		groupings: StagingFinancialGrouping[];
		identifierRelationships: StagingIdentifierRelationships;
	}) {
		this.groupings = args.groupings;
		this.identifierRelationships = args.identifierRelationships;
	}
}
