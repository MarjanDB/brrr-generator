import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";

export interface ITaxAuthorityProvider<TReportType, TReportData> {
	generateReportData(reportType: TReportType, events: FinancialEvents): TReportData[];
	generateExportForTaxAuthority(reportType: TReportType, events: FinancialEvents): string;
	generateSpreadsheetExport(reportType: TReportType, events: FinancialEvents): Record<string, unknown>[];
}
