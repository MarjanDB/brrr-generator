import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";
import type { Container } from "inversify";

export function loadCoreModule(container: Container): void {
	container.bind(LotMatcher).toResolvedValue(() => new LotMatcher()).inSingletonScope();

	container.bind(FinancialEventsProcessor).toResolvedValue(
		(lotMatcher: LotMatcher) => new FinancialEventsProcessor(null, lotMatcher),
		[LotMatcher],
	).inSingletonScope();

	container.bind(ApplyIdentifierRelationshipsService).toResolvedValue(() => new ApplyIdentifierRelationshipsService()).inSingletonScope();

	container.bind(StagingFinancialGroupingProcessor).toResolvedValue(() => new StagingFinancialGroupingProcessor()).inSingletonScope();
}
