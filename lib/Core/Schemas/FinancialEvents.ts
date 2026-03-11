import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping.ts";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationship.ts";

export class FinancialEvents {
	public readonly groupings: FinancialGrouping[];
	public readonly identifierRelationships: IdentifierRelationshipAny[];

	constructor(args: {
		groupings: FinancialGrouping[];
		identifierRelationships: IdentifierRelationshipAny[];
	}) {
		this.groupings = args.groupings;
		this.identifierRelationships = args.identifierRelationships;
	}
}
