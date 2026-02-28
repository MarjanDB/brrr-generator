import type { Container } from "inversify";
import { LotMatcher } from "@brrr/core/lotMatching/LotMatcher.ts";
import { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/core/financialEvents/ApplyIdentifierRelationshipsService.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/core/stagingProcessor/StagingFinancialGroupingProcessor.ts";

export function loadCoreModule(container: Container): void {
	container.bind(LotMatcher).toResolvedValue(() => new LotMatcher());
	container.bind(FinancialEventsProcessor).toResolvedValue(
		(lotMatcher: LotMatcher) => new FinancialEventsProcessor(null, lotMatcher),
		[LotMatcher],
	);
	container.bind(ApplyIdentifierRelationshipsService).toResolvedValue(() => new ApplyIdentifierRelationshipsService());
	container.bind(StagingFinancialGroupingProcessor).toResolvedValue(() => new StagingFinancialGroupingProcessor());
}
