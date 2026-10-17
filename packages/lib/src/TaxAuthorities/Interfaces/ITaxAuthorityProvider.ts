import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { ReportTypeId, TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";

export type TaxAuthorityRunContext = {
	taxPayerInfo: TaxPayerInfo;
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
