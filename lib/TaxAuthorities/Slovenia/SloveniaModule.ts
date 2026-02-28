import type { Container } from "inversify";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";

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
