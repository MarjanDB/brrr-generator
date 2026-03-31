import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { InfoProvider } from "@brrr/InfoProviders/InfoProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
import { SlovenianTaxAuthorityService } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityService";
import type { Container } from "inversify";

export function loadSloveniaModule(container: Container): void {
	container
		.bind(KdvpReportGenerator)
		.toResolvedValue(
			(processor: FinancialEventsProcessor) => new KdvpReportGenerator(processor),
			[FinancialEventsProcessor],
		)
		.inSingletonScope();

	container
		.bind(DivReportGenerator)
		.toResolvedValue(
			(infoProvider: InfoProvider) => new DivReportGenerator(infoProvider),
			[InfoProvider.Token],
		)
		.inSingletonScope();

	container
		.bind(IfiReportGenerator)
		.toResolvedValue(
			(processor: FinancialEventsProcessor) => new IfiReportGenerator(processor),
			[FinancialEventsProcessor],
		)
		.inSingletonScope();

	container
		.bind(SlovenianTaxAuthorityService)
		.toResolvedValue(
			(provider: SlovenianTaxAuthorityProvider) => new SlovenianTaxAuthorityService(provider),
			[SlovenianTaxAuthorityProvider],
		)
		.inSingletonScope();

	container
		.bind(SlovenianTaxAuthorityProvider)
		.toResolvedValue(
			(
				apply: ApplyIdentifierRelationshipsService,
				kdvp: KdvpReportGenerator,
				div: DivReportGenerator,
				ifi: IfiReportGenerator,
			) => new SlovenianTaxAuthorityProvider(apply, kdvp, div, ifi),
			[
				ApplyIdentifierRelationshipsService,
				KdvpReportGenerator,
				DivReportGenerator,
				IfiReportGenerator,
			],
		)
		.inSingletonScope();
}
