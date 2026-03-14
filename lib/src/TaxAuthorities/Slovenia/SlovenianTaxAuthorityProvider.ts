import type { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import type { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import type { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { EDavkiDocumentWorkflowType, SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import type {
	EDavkiDividendReportLine,
	EDavkiGenericDerivativeReportItem,
	EDavkiGenericTradeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import type { ITaxAuthorityProvider } from "@brrr/TaxAuthorities/TaxAuthorityProvider";
import { DateTime } from "luxon";

type SlovenianReportItem = EDavkiGenericTradeReportItem | EDavkiDividendReportLine | EDavkiGenericDerivativeReportItem;

export class SlovenianTaxAuthorityProvider implements ITaxAuthorityProvider<SlovenianTaxAuthorityReportTypes, SlovenianReportItem> {
	constructor(
		private readonly taxPayerInfo: TaxPayerInfo,
		private readonly reportConfig: TaxAuthorityConfiguration,
		private readonly applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService,
		private readonly kdvpGenerator: KdvpReportGenerator,
		private readonly divGenerator: DivReportGenerator,
		private readonly ifiGenerator: IfiReportGenerator,
	) {}

	// A report is a "self-report" if the report period ended more than 1 year before the current date.
	// This determines the eDavki document workflow type (ORIGINAL vs SELF_REPORT).
	isSelfReport(currentTime: DateTime): boolean {
		const currentYear = currentTime.year;
		const lastYear = currentYear - 1;
		const reportEndPeriod = this.reportConfig.toDate.minus({ days: 1 }).year;
		return reportEndPeriod < lastYear;
	}

	private _applyRelationships(events: FinancialEvents) {
		return this.applyIdentifierRelationshipsService.apply(events, [
			IdentifierChangeType.RENAME,
			IdentifierChangeType.SPLIT,
			IdentifierChangeType.REVERSE_SPLIT,
		]).groupings;
	}

	async generateReportData(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): Promise<SlovenianReportItem[]> {
		const data = this._applyRelationships(events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.convert(this.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			return await this.divGenerator.convert(this.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.convert(this.reportConfig, data);
		}

		return [];
	}

	async generateExportForTaxAuthority(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): Promise<string> {
		const data = this._applyRelationships(events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toXml(
				this.reportConfig,
				this.taxPayerInfo,
				EDavkiDocumentWorkflowType.ORIGINAL,
				this.kdvpGenerator.convert(this.reportConfig, data),
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			const converted = await this.divGenerator.convert(this.reportConfig, data);
			return this.divGenerator.toXml(
				this.reportConfig,
				this.taxPayerInfo,
				this.isSelfReport(DateTime.now()),
				converted,
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toXml(
				this.reportConfig,
				this.ifiGenerator.convert(this.reportConfig, data),
			);
		}

		return "";
	}

	async generateSpreadsheetExport(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): Promise<string> {
		const data = this._applyRelationships(events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toCsv(this.kdvpGenerator.convert(this.reportConfig, data));
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			const converted = await this.divGenerator.convert(this.reportConfig, data);
			return this.divGenerator.toCsv(converted);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toCsv(this.ifiGenerator.convert(this.reportConfig, data));
		}

		return "";
	}
}
