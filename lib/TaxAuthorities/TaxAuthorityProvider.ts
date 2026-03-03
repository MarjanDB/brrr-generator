import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";

export interface ITaxAuthorityProvider<TReportType, TReportData> {
	generateReportData(reportType: TReportType, events: FinancialEvents): Promise<TReportData[]>;
	generateExportForTaxAuthority(reportType: TReportType, events: FinancialEvents): Promise<string>;
	generateSpreadsheetExport(reportType: TReportType, events: FinancialEvents): Promise<string>;
}
