import type { EDavkiGenericDerivativeReportItem } from "@brrr/taxAuthorities/slovenia/schemas/Schemas.ts";

type CsvRow = Record<string, unknown>;

export function generateCsvReport(convertedTrades: EDavkiGenericDerivativeReportItem[]): CsvRow[] {
  if (convertedTrades.length === 0) {
    return [];
  }

  const rows: CsvRow[] = [];

  for (const entry of convertedTrades) {
    for (const item of entry.items) {
      const row: CsvRow = {
        Name: entry.name,
        ...item,
        ISIN: entry.isin,
        Ticker: entry.code,
        HasForeignTax: entry.hasForeignTax,
        ForeignTax: entry.foreignTax,
        ForeignTaxCountryID: entry.ftCountryId,
        ForeignTaxCountryName: entry.ftCountryName,
      };
      rows.push(row);
    }
  }

  return rows;
}
