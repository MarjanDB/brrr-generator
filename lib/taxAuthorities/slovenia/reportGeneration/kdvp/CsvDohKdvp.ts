import type { EDavkiGenericTradeReportItem } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";

type CsvRow = Record<string, unknown>;

export function generateCsvReport(convertedTrades: EDavkiGenericTradeReportItem[]): CsvRow[] {
	const rows: CsvRow[] = [];

	for (const entry of convertedTrades) {
		for (const secLine of entry.items) {
			for (const event of secLine.events) {
				const row: CsvRow = {
					...event,
					ISIN: secLine.isin,
					Ticker: secLine.code,
					HasForeignTax: entry.hasForeignTax,
					ForeignTax: entry.foreignTax,
					ForeignTaxCountryID: entry.foreignTransfer,
					ForeignTaxCountryName: entry.hasForeignTax,
				};
				rows.push(row);
			}
		}
	}

	// Reorder: Ticker first
	return rows.map((row) => {
		const { Ticker, ...rest } = row;
		return { Ticker, ...rest };
	});
}
