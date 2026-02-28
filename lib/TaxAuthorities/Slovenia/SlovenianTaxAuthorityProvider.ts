import { DateTime } from "luxon";
import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.ts";
import type { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { EDavkiDocumentWorkflowType, SlovenianTaxAuthorityReportTypes } from "./Schemas/ReportTypes.ts";
import type { EDavkiDividendReportLine, EDavkiGenericDerivativeReportItem, EDavkiGenericTradeReportItem } from "./Schemas/Schemas.ts";
import type { KdvpReportGenerator } from "./ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import type { DivReportGenerator } from "./ReportGeneration/Div/DivReportGenerator.ts";
import type { IfiReportGenerator } from "./ReportGeneration/Ifi/IfiReportGenerator.ts";

type SlovenianReportData =
	| EDavkiGenericTradeReportItem[]
	| EDavkiDividendReportLine[]
	| EDavkiGenericDerivativeReportItem[];

export class SlovenianTaxAuthorityProvider {
	constructor(
		private readonly taxPayerInfo: TaxPayerInfo,
		private readonly reportConfig: TaxAuthorityConfiguration,
		private readonly applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService,
		private readonly kdvpGenerator: KdvpReportGenerator,
		private readonly divGenerator: DivReportGenerator,
		private readonly ifiGenerator: IfiReportGenerator,
	) {}

	isSelfReport(currentTime: DateTime): boolean {
		const currentYear = currentTime.year;
		const lastYear = currentYear - 1;
		const reportEndPeriod = this.reportConfig.toDate.minus({ days: 1 }).year;
		return reportEndPeriod < lastYear;
	}

	generateReportData(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): SlovenianReportData {
		const applied = this.applyIdentifierRelationshipsService.apply(events, [
			IdentifierChangeType.RENAME,
			IdentifierChangeType.SPLIT,
			IdentifierChangeType.REVERSE_SPLIT,
		]);
		const data = applied.groupings;

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.convert(this.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			return this.divGenerator.convert(this.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.convert(this.reportConfig, data);
		}

		return [];
	}

	generateExportForTaxAuthority(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): string {
		const reportData = this.generateReportData(reportType, events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toXml(
				this.reportConfig,
				this.taxPayerInfo,
				EDavkiDocumentWorkflowType.ORIGINAL,
				reportData as EDavkiGenericTradeReportItem[],
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			const isSelfReport = this.isSelfReport(DateTime.now());
			return this.divGenerator.toXml(
				this.reportConfig,
				this.taxPayerInfo,
				isSelfReport,
				reportData as EDavkiDividendReportLine[],
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toXml(
				this.reportConfig,
				reportData as EDavkiGenericDerivativeReportItem[],
			);
		}

		return "";
	}

	generateSpreadsheetExport(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): Record<string, unknown>[] {
		const reportData = this.generateReportData(reportType, events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toCsv(reportData as EDavkiGenericTradeReportItem[]);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			return this.divGenerator.toCsv(reportData as EDavkiDividendReportLine[]);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toCsv(reportData as EDavkiGenericDerivativeReportItem[]);
		}

		return [];
	}
}
