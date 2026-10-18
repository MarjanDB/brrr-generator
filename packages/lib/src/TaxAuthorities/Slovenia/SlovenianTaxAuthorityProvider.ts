import type { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService";
import { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import type {
	GeneratedExports,
	ITaxAuthorityProvider,
	TaxAuthorityDescriptor,
	TaxAuthorityRunContext,
} from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import type { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator";
import type { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator";
import type { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import {
	EDavkiDocumentWorkflowType,
	SlovenianReportTypeId,
	SlovenianTaxAuthorityReportTypes,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { ReportTypeId, TaxAuthorityId } from "@brrr/TaxAuthorities/TaxAuthorityIdentifiers";
import { DateTime } from "luxon";

const REPORT_TYPES: {
	reportTypeId: SlovenianReportTypeId;
	displayName: string;
	reportType: SlovenianTaxAuthorityReportTypes;
}[] = [
	{
		reportTypeId: SlovenianReportTypeId.KDVP,
		displayName: "DOH_KDVP",
		reportType: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
	},
	{
		reportTypeId: SlovenianReportTypeId.DIV,
		displayName: "DOH_DIV",
		reportType: SlovenianTaxAuthorityReportTypes.DOH_DIV,
	},
	{
		reportTypeId: SlovenianReportTypeId.IFI,
		displayName: "D_IFI",
		reportType: SlovenianTaxAuthorityReportTypes.D_IFI,
	},
];

export class SlovenianTaxAuthorityProvider implements ITaxAuthorityProvider {
	public readonly descriptor: TaxAuthorityDescriptor = {
		authorityId: TaxAuthorityId.SLOVENIA,
		displayName: "Slovenia (eDavki)",
		reportTypes: REPORT_TYPES.map(({ reportTypeId, displayName }) => ({
			reportTypeId: ReportTypeId.Schema.parse(reportTypeId),
			displayName,
		})),
	};

	constructor(
		private readonly applyIdentifierRelationshipsService: ApplyIdentifierRelationshipsService,
		private readonly kdvpGenerator: KdvpReportGenerator,
		private readonly divGenerator: DivReportGenerator,
		private readonly ifiGenerator: IfiReportGenerator,
	) {}

	// A report is a "self-report" if the report period ended more than 1 year before the current date.
	// It sets DOH_DIV's SelfReport flag; every document is still filed with the ORIGINAL workflow.
	isSelfReport(currentTime: DateTime, reportConfig: TaxAuthorityConfiguration): boolean {
		const currentYear = currentTime.year;
		const lastYear = currentYear - 1;
		const reportEndPeriod = reportConfig.toDate.minus({ days: 1 }).year;
		return reportEndPeriod < lastYear;
	}

	async generateExports(
		reportTypeId: ReportTypeId,
		ctx: TaxAuthorityRunContext,
	): Promise<GeneratedExports> {
		const entry = REPORT_TYPES.find((type) => type.reportTypeId === reportTypeId);
		if (!entry) {
			throw new Error(
				`Unsupported report type '${reportTypeId}' for tax authority: ${this.descriptor.authorityId}`,
			);
		}
		return this.generate(entry.reportType, ctx);
	}

	// Builds the report once and renders it both as the XML eDavki imports and as a CSV.
	async generate(
		reportType: SlovenianTaxAuthorityReportTypes,
		ctx: TaxAuthorityRunContext,
	): Promise<GeneratedExports> {
		const { reportConfig, taxpayerInfo } = ctx;
		const groupings = this.applyIdentifierRelationshipsService.apply(ctx.events, [
			IdentifierChangeType.RENAME,
			IdentifierChangeType.SPLIT,
			IdentifierChangeType.REVERSE_SPLIT,
		]).groupings;

		switch (reportType) {
			case SlovenianTaxAuthorityReportTypes.DOH_KDVP: {
				const items = this.kdvpGenerator.convert(reportConfig, groupings);
				return {
					xml: this.kdvpGenerator.toXml(
						reportConfig,
						taxpayerInfo,
						EDavkiDocumentWorkflowType.ORIGINAL,
						items,
					),
					csv: this.kdvpGenerator.toCsv(items),
				};
			}
			case SlovenianTaxAuthorityReportTypes.DOH_DIV: {
				const lines = await this.divGenerator.convert(reportConfig, groupings);
				return {
					xml: this.divGenerator.toXml(
						reportConfig,
						taxpayerInfo,
						this.isSelfReport(DateTime.now(), reportConfig),
						lines,
					),
					csv: this.divGenerator.toCsv(lines),
				};
			}
			case SlovenianTaxAuthorityReportTypes.D_IFI: {
				const items = this.ifiGenerator.convert(reportConfig, groupings);
				return {
					xml: this.ifiGenerator.toXml(reportConfig, items),
					csv: this.ifiGenerator.toCsv(items),
				};
			}
		}
	}
}
