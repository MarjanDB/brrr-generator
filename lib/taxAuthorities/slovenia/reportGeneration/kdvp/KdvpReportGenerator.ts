import type { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { EDavkiDocumentWorkflowType } from "@brrr/taxAuthorities/slovenia/schemas/ReportTypes.ts";
import type { EDavkiGenericTradeReportItem } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";
import { convertTradesToKdvpItems } from "./Common.ts";
import { generateXmlReport } from "./XmlDohKdvp.ts";
import { generateCsvReport } from "./CsvDohKdvp.ts";

export class KdvpReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiGenericTradeReportItem[] {
		return convertTradesToKdvpItems(config, groupings, this.processor);
	}

	toXml(
		config: TaxAuthorityConfiguration,
		userConfig: TaxPayerInfo,
		documentType: EDavkiDocumentWorkflowType,
		items: EDavkiGenericTradeReportItem[],
	): string {
		return generateXmlReport(config, userConfig, documentType, items);
	}

	toCsv(items: EDavkiGenericTradeReportItem[]): Record<string, unknown>[] {
		return generateCsvReport(items);
	}
}
