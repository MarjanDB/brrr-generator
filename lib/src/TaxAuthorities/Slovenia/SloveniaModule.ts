import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { InfoProvider } from "@brrr/InfoProviders/InfoProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import type { Container } from "inversify";

export function loadSloveniaModule(container: Container): void {
	container
		.bind(KdvpReportGenerator)
		.toResolvedValue(
			(processor: FinancialEventsProcessor) => new KdvpReportGenerator(processor),
			[FinancialEventsProcessor],
		);

	container
		.bind(DivReportGenerator)
		.toResolvedValue(
			(infoProvider: InfoProvider) => new DivReportGenerator(infoProvider),
			[InfoProvider.Token],
		);

	container
		.bind(IfiReportGenerator)
		.toResolvedValue(
			(processor: FinancialEventsProcessor) => new IfiReportGenerator(processor),
			[FinancialEventsProcessor],
		);
}
