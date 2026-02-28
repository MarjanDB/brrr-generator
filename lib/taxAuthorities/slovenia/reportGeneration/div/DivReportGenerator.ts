import type { CompanyLookupProvider, CountryLookupProvider } from "@brrr/infoProviders/InfoLookupProvider.ts";
import type { FinancialGrouping } from "@brrr/core/schemas/Grouping.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { EDavkiDividendReportLine } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";
import { convertCashTransactionsToDivItems } from "./Common.ts";
import { generateXmlReport } from "./XmlDohDiv.ts";
import { generateCsvReport } from "./CsvDohDiv.ts";

export class DivReportGenerator {
	constructor(
		private readonly companyLookup: CompanyLookupProvider,
		private readonly countryLookup: CountryLookupProvider,
	) {}

	convert(config: TaxAuthorityConfiguration, groupings: FinancialGrouping[]): EDavkiDividendReportLine[] {
		return convertCashTransactionsToDivItems(config, groupings, this.companyLookup, this.countryLookup);
	}

	toXml(config: TaxAuthorityConfiguration, userConfig: TaxPayerInfo, selfReport: boolean, items: EDavkiDividendReportLine[]): string {
		return generateXmlReport(config, userConfig, selfReport, items);
	}

	toCsv(items: EDavkiDividendReportLine[]): Record<string, unknown>[] {
		return generateCsvReport(items);
	}
}
