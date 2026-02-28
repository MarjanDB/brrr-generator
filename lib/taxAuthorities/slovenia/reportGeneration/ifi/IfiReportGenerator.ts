import type { FinancialEventsProcessor } from "@brrr/core/financialEvents/FinancialEventsProcessor.ts";
import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { TaxAuthorityConfiguration } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { EDavkiGenericDerivativeReportItem } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";
import { convertTradesToIfiItems } from "./Common.ts";
import { generateXmlReport } from "./XmlDIfi.ts";
import { generateCsvReport } from "./CsvDIfi.ts";

export class IfiReportGenerator {
	constructor(private readonly processor: FinancialEventsProcessor) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiGenericDerivativeReportItem[] {
		return convertTradesToIfiItems(config, groupings, this.processor);
	}

	toXml(config: TaxAuthorityConfiguration, items: EDavkiGenericDerivativeReportItem[]): string {
		return generateXmlReport(config, items);
	}

	toCsv(items: EDavkiGenericDerivativeReportItem[]): Record<string, unknown>[] {
		return generateCsvReport(items);
	}
}
