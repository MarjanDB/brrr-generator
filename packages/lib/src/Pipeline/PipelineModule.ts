import { BrokerRegistry } from "@brrr/Brokers/BrokerRegistry";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/Services/StagingProcessing/StagingFinancialGroupingProcessor";
import { ReportPipeline } from "@brrr/Pipeline/ReportPipeline";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";
import type { Container } from "inversify";

export function loadPipelineModule(container: Container): void {
	container
		.bind(ReportPipeline)
		.toResolvedValue(
			(
				brokers: BrokerRegistry,
				staging: StagingFinancialGroupingProcessor,
				taxAuthorities: TaxAuthorityRegistry,
			) => new ReportPipeline(brokers, staging, taxAuthorities),
			[BrokerRegistry, StagingFinancialGroupingProcessor, TaxAuthorityRegistry],
		)
		.inSingletonScope();
}
