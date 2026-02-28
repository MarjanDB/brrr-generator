import type { EDavkiDividendReportLine } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";

type CsvRow = Record<string, unknown>;

export function generateCsvReport(divLines: EDavkiDividendReportLine[]): CsvRow[] {
	return divLines.map((data) => ({
		"Datum prejema dividend": data.dateReceived.toFormat("yyyy-MM-dd"),
		"Davčna številka izplačevalca dividend": data.taxNumberForDividendPayer,
		"Identifikacijska številka izplačevalca dividend": data.dividendPayerIdentificationNumber,
		"Naziv izplačevalca dividend": data.dividendPayerTitle,
		"Naslov izplačevalca dividend": data.dividendPayerAddress,
		"Država izplačevalca dividend": data.dividendPayerCountryOfOrigin,
		"Šifra vrste dividend": data.dividendType,
		"Znesek dividend (v EUR)": data.dividendAmount,
		"Znesek dividend (v Originalni Valuti)": data.dividendAmountInOriginalCurrency,
		"Tuji davek (v EUR)": data.foreignTaxPaid,
		"Tuji davek (v Originalni Valuti)": data.foreignTaxPaidInOriginalCurrency,
		"Država vira": data.countryOfOrigin,
		"Uveljavljam oprostitev po mednarodni pogodbi": data.taxReliefParagraphInInternationalTreaty,
		"Action Tracking": data.dividendIdentifierForTracking,
	}));
}
