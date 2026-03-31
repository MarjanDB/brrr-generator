import type { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import type {
	ITaxAuthorityProvider,
	TaxAuthorityRunContext,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import type { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import type { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import {
	EDavkiDocumentWorkflowType,
	SlovenianTaxAuthorityReportTypes,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import type {
	EDavkiDividendReportLine,
	EDavkiGenericDerivativeReportItem,
	EDavkiGenericTradeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import { DateTime } from "luxon";

type SlovenianReportItem =
	| EDavkiGenericTradeReportItem
	| EDavkiDividendReportLine
	| EDavkiGenericDerivativeReportItem;

export class SlovenianTaxAuthorityProvider
	implements ITaxAuthorityProvider<SlovenianTaxAuthorityReportTypes, SlovenianReportItem>
{
	public readonly descriptor = {
		authorityId: "slovenia",
		displayName: "Slovenia (eDavki)",
		reportTypes: [
			{ reportTypeId: "kdvp", displayName: "DOH_KDVP" },
			{ reportTypeId: "div", displayName: "DOH_DIV" },
			{ reportTypeId: "ifi", displayName: "D_IFI" },
		],
	};

	constructor(
		private readonly applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService,
		private readonly kdvpGenerator: KdvpReportGenerator,
		private readonly divGenerator: DivReportGenerator,
		private readonly ifiGenerator: IfiReportGenerator,
	) {}

	// A report is a "self-report" if the report period ended more than 1 year before the current date.
	// This determines the eDavki document workflow type (ORIGINAL vs SELF_REPORT).
	isSelfReport(currentTime: DateTime, reportConfig: TaxAuthorityConfiguration): boolean {
		const currentYear = currentTime.year;
		const lastYear = currentYear - 1;
		const reportEndPeriod = reportConfig.toDate.minus({ days: 1 }).year;
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
		ctx: TaxAuthorityRunContext,
	): Promise<SlovenianReportItem[]> {
		const data = this._applyRelationships(ctx.events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.convert(ctx.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			return await this.divGenerator.convert(ctx.reportConfig, data);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.convert(ctx.reportConfig, data);
		}

		return [];
	}

	async generateExportForTaxAuthority(
		reportType: SlovenianTaxAuthorityReportTypes,
		ctx: TaxAuthorityRunContext,
	): Promise<string> {
		const data = this._applyRelationships(ctx.events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toXml(
				ctx.reportConfig,
				ctx.taxPayerInfo,
				EDavkiDocumentWorkflowType.ORIGINAL,
				this.kdvpGenerator.convert(ctx.reportConfig, data),
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			const converted = await this.divGenerator.convert(ctx.reportConfig, data);
			return this.divGenerator.toXml(
				ctx.reportConfig,
				ctx.taxPayerInfo,
				this.isSelfReport(DateTime.now(), ctx.reportConfig),
				converted,
			);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toXml(
				ctx.reportConfig,
				this.ifiGenerator.convert(ctx.reportConfig, data),
			);
		}

		return "";
	}

	async generateSpreadsheetExport(
		reportType: SlovenianTaxAuthorityReportTypes,
		ctx: TaxAuthorityRunContext,
	): Promise<string> {
		const data = this._applyRelationships(ctx.events);

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_KDVP) {
			return this.kdvpGenerator.toCsv(this.kdvpGenerator.convert(ctx.reportConfig, data));
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.DOH_DIV) {
			const converted = await this.divGenerator.convert(ctx.reportConfig, data);
			return this.divGenerator.toCsv(converted);
		}

		if (reportType === SlovenianTaxAuthorityReportTypes.D_IFI) {
			return this.ifiGenerator.toCsv(this.ifiGenerator.convert(ctx.reportConfig, data));
		}

		return "";
	}
}
