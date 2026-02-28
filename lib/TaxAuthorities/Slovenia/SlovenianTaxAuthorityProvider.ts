import type { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents.ts";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
import type { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";
import type { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import { EDavkiDocumentWorkflowType, SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import type {
	EDavkiDividendReportLine,
	EDavkiGenericDerivativeReportItem,
	EDavkiGenericTradeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas.ts";
import type { ITaxAuthorityProvider } from "@brrr/TaxAuthorities/TaxAuthorityProvider.ts";
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

	generateReportData(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): SlovenianReportItem[] {
		const data = this._applyRelationships(events);

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
			return this.divGenerator.toXml(
				this.reportConfig,
				this.taxPayerInfo,
				this.isSelfReport(DateTime.now()),
				this.divGenerator.convert(this.reportConfig, data),
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

	generateSpreadsheetExport(
		reportType: SlovenianTaxAuthorityReportTypes,
		events: FinancialEvents,
	): string {
		const data = this._applyRelationships(events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toCsv(this.kdvpGenerator.convert(this.reportConfig, data));
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			return this.divGenerator.toCsv(this.divGenerator.convert(this.reportConfig, data));
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toCsv(this.ifiGenerator.convert(this.reportConfig, data));
		}

		return "";
	}
}
