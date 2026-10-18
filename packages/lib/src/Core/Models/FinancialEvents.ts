import type { FinancialGrouping } from "@brrr/Core/Models/Groupings/FinancialGrouping";
import type { IdentifierRelationshipAny } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipAny";

export class FinancialEvents {
	public readonly groupings: FinancialGrouping[];
	public readonly identifierRelationships: IdentifierRelationshipAny[];

	public constructor(args: {
		groupings: FinancialGrouping[];
		identifierRelationships: IdentifierRelationshipAny[];
	}) {
		this.groupings = args.groupings;
		this.identifierRelationships = args.identifierRelationships;
	}
}
