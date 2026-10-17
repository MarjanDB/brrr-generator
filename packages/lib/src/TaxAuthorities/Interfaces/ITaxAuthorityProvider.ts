import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";

export type TaxAuthorityRunContext = {
	taxPayerInfo: TaxPayerInfo;
	reportConfig: TaxAuthorityConfiguration;
	events: FinancialEvents;
};

export type TaxAuthorityDescriptor = {
	authorityId: string;
	displayName: string;
	reportTypes: { reportTypeId: string; displayName: string }[];
};

export type GeneratedExports = { xml: string; csv: string };

export interface ITaxAuthorityProvider {
	readonly descriptor: TaxAuthorityDescriptor;

	generateExports(reportTypeId: string, ctx: TaxAuthorityRunContext): Promise<GeneratedExports>;
}
