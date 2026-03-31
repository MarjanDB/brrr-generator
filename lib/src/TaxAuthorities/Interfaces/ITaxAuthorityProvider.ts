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

export interface ITaxAuthorityProvider<TReportType, TReportData> {
	readonly descriptor: TaxAuthorityDescriptor;

	generateReportData(reportType: TReportType, ctx: TaxAuthorityRunContext): Promise<TReportData[]>;

	generateExportForTaxAuthority(
		reportType: TReportType,
		ctx: TaxAuthorityRunContext,
	): Promise<string>;

	generateSpreadsheetExport(reportType: TReportType, ctx: TaxAuthorityRunContext): Promise<string>;
}
