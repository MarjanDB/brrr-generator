import { ApplyIdentifierRelationshipsService } from "@brrr/Core/Services/IdentifierRelationships/ApplyIdentifierRelationshipsService";
import { FinancialEventsProcessor } from "@brrr/Core/Services/LotMatching/FinancialEventsProcessor";
import { IInfoProvider } from "@brrr/InfoProviders/IInfoProvider";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Div/DivReportGenerator";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Ifi/IfiReportGenerator";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Kdvp/KdvpReportGenerator";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
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
			(infoProvider: IInfoProvider) => new DivReportGenerator(infoProvider),
			[IInfoProvider.Token],
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
