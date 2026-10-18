import type { FinancialGrouping } from "@brrr/Core/Schemas/Groupings/FinancialGrouping";
import type { IdentifierRelationshipAny } from "@brrr/Core/Schemas/IdentifierRelationships/IdentifierRelationshipAny";

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
