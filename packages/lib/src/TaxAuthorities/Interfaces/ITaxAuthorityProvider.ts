import type { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/Models/TaxAuthorityConfiguration";
import type { TaxAuthorityDescriptor } from "@brrr/TaxAuthorities/Models/TaxAuthorityDescriptor";
import type { ReportTypeId } from "@brrr/TaxAuthorities/Models/TaxAuthorityIdentifiers";
import type { TaxpayerInfo } from "@brrr/TaxAuthorities/Schemas/TaxpayerConfigSchema";

export type TaxAuthorityRunContext = {
	taxpayerInfo: TaxpayerInfo;
	reportConfig: TaxAuthorityConfiguration;
	events: FinancialEvents;
};

export type GeneratedExports = { xml: string; csv: string };

export interface ITaxAuthorityProvider {
	readonly descriptor: TaxAuthorityDescriptor;

	generateExports(
		reportTypeId: ReportTypeId,
		ctx: TaxAuthorityRunContext,
	): Promise<GeneratedExports>;
}
