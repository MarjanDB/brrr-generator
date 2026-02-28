import type { Container } from "inversify";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";

export function loadCoreModule(container: Container): void {
	container.bind(LotMatcher).toResolvedValue(() => new LotMatcher());
	container.bind(FinancialEventsProcessor).toResolvedValue(
		(lotMatcher: LotMatcher) => new FinancialEventsProcessor(null, lotMatcher),
		[LotMatcher],
	);
	container.bind(ApplyIdentifierRelationshipsService).toResolvedValue(() => new ApplyIdentifierRelationshipsService());
	container.bind(StagingFinancialGroupingProcessor).toResolvedValue(() => new StagingFinancialGroupingProcessor());
}
