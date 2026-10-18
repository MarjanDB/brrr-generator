import type { FinancialEvents } from "@brrr/Core/Models/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxpayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { ReportTypeId, TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";

export type TaxAuthorityRunContext = {
	taxpayerInfo: TaxpayerInfo;
	reportConfig: TaxAuthorityConfiguration;
	events: FinancialEvents;
};

export type TaxAuthorityDescriptor = {
	authorityId: TaxAuthorityId;
	displayName: string;
	reportTypes: { reportTypeId: ReportTypeId; displayName: string }[];
};

export type GeneratedExports = { xml: string; csv: string };

export interface ITaxAuthorityProvider {
	readonly descriptor: TaxAuthorityDescriptor;

	generateExports(
		reportTypeId: ReportTypeId,
		ctx: TaxAuthorityRunContext,
	): Promise<GeneratedExports>;
}
