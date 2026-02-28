import type { Container } from "inversify";
import { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/infoProviders/InfoLookupProvider.ts";
import { KdvpReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/kdvp/KdvpReportGenerator.ts";
import { DivReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/taxAuthorities/slovenia/reportGeneration/ifi/IfiReportGenerator.ts";

export function loadSloveniaModule(container: Container): void {
	container.bind(KdvpReportGenerator).toResolvedValue(
		(processor: FinancialEventsProcessor) => new KdvpReportGenerator(processor),
		[FinancialEventsProcessor],
	);
	container.bind(DivReportGenerator).toResolvedValue(
		(companyLookup: CompanyLookupProvider, countryLookup: CountryLookupProvider) =>
			new DivReportGenerator(companyLookup, countryLookup),
		[CompanyLookupProvider, CountryLookupProvider],
	);
	container.bind(IfiReportGenerator).toResolvedValue(
		(processor: FinancialEventsProcessor) => new IfiReportGenerator(processor),
		[FinancialEventsProcessor],
	);
}
