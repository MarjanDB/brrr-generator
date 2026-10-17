import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import { IdentifierRelationshipResolution } from "@brrr/Core/StagingProcessor/IdentifierRelationshipResolution";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";
import type { Container } from "inversify";

export function loadCoreModule(container: Container): void {
	container
		.bind(LotMatcher)
		.toResolvedValue(() => new LotMatcher())
		.inSingletonScope();

	container
		.bind(FinancialEventsProcessor)
		.toResolvedValue(
			(lotMatcher: LotMatcher) => new FinancialEventsProcessor(lotMatcher),
			[LotMatcher],
		)
		.inSingletonScope();

	container
		.bind(ApplyIdentifierRelationshipsService)
		.toResolvedValue(() => new ApplyIdentifierRelationshipsService())
		.inSingletonScope();

	container
		.bind(IdentifierRelationshipResolution)
		.toResolvedValue(() => new IdentifierRelationshipResolution())
		.inSingletonScope();

	container
		.bind(StagingFinancialGroupingProcessor)
		.toResolvedValue(
			(resolution: IdentifierRelationshipResolution) =>
				new StagingFinancialGroupingProcessor(resolution),
			[IdentifierRelationshipResolution],
		)
		.inSingletonScope();
}
