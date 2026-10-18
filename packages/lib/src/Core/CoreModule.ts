import { ApplyIdentifierRelationshipsService } from "@brrr/Core/Services/IdentifierRelationships/ApplyIdentifierRelationshipsService";
import { FinancialEventsProcessor } from "@brrr/Core/Services/LotMatching/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/Services/LotMatching/LotMatcher";
import { IdentifierRelationshipResolution } from "@brrr/Core/Services/StagingProcessing/IdentifierRelationshipResolution";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/Services/StagingProcessing/StagingFinancialGroupingProcessor";
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
