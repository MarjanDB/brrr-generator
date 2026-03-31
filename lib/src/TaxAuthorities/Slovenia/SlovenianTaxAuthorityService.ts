import type { FinancialEvents } from "@brrr/Core/Schemas/FinancialEvents";
import type {
	TaxAuthorityConfiguration,
	TaxPayerInfo,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import type { TaxAuthorityDescriptor } from "@brrr/TaxAuthorities/Interfaces/ITaxAuthorityProvider";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import type { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider";
import type { GeneratedExports } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";

export class SlovenianTaxAuthorityService {
	constructor(private readonly provider: SlovenianTaxAuthorityProvider) {}

	public readonly descriptor: TaxAuthorityDescriptor = {
		authorityId: "slovenia",
		displayName: "Slovenia (eDavki)",
		reportTypes: [
			{ reportTypeId: "kdvp", displayName: "DOH_KDVP" },
			{ reportTypeId: "div", displayName: "DOH_DIV" },
			{ reportTypeId: "ifi", displayName: "D_IFI" },
		],
	};

	public async generateExports(args: {
		reportTypeId: string;
		taxPayerInfo: TaxPayerInfo;
		reportConfig: TaxAuthorityConfiguration;
		events: FinancialEvents;
	}): Promise<GeneratedExports> {
		let reportType: SlovenianTaxAuthorityReportTypes | null = null;

		const reportTypeMapping = {
			kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
			div: SlovenianTaxAuthorityReportTypes.DOH_DIV,
			ifi: SlovenianTaxAuthorityReportTypes.D_IFI,
		};

		reportType = reportTypeMapping[args.reportTypeId as keyof typeof reportTypeMapping];

		if (!reportType) {
			throw new Error(
				`Unsupported report type '${args.reportTypeId}' for tax authority: ${this.descriptor.authorityId}`,
			);
		}

		const [xml, csv] = await Promise.all([
			this.provider.generateExportForTaxAuthority(reportType, {
				taxPayerInfo: args.taxPayerInfo,
				reportConfig: args.reportConfig,
				events: args.events,
			}),
			this.provider.generateSpreadsheetExport(reportType, {
				taxPayerInfo: args.taxPayerInfo,
				reportConfig: args.reportConfig,
				events: args.events,
			}),
		]);

		return { xml, csv };
	}
}
