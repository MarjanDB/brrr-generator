import { generateCsvReport as generateDivCsv } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/CsvDohDiv";
import { generateCsvReport as generateIfiCsv } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/CsvDIfi";
import { generateCsvReport as generateKdvpCsv } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/CsvDohKdvp";
import {
	EDavkiDividendReportLine,
	EDavkiDividendType,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import { DateTime } from "luxon";

// The web app runs the CSV generators in the browser, where Node's global Buffer doesn't exist.
// Remove it before the imports above are evaluated, so a Node-only dependency fails here too.
vi.hoisted(() => {
	vi.stubGlobal("Buffer", undefined);
});

afterAll(() => {
	vi.unstubAllGlobals();
});

describe("CSV report generation without Node's Buffer", () => {
	it("generates the dividend CSV", () => {
		const csv = generateDivCsv([
			new EDavkiDividendReportLine({
				dateReceived: DateTime.fromISO("2025-03-14"),
				taxNumberForDividendPayer: "123",
				dividendPayerIdentificationNumber: "US0378331005",
				dividendPayerTitle: "Apple, Inc.",
				dividendPayerAddress: null,
				dividendPayerCountryOfOrigin: "US",
				dividendType: EDavkiDividendType.ORDINARY,
				countryOfOrigin: "US",
				dividendIdentifierForTracking: "AAPL-2025-03-14",
				taxReliefParagraphInInternationalTreaty: null,
				dividendAmount: 1.5,
				dividendAmountInOriginalCurrency: 1.62,
				foreignTaxPaid: 0.23,
				foreignTaxPaidInOriginalCurrency: 0.24,
			}),
		]);

		expect(csv.split("\n")[1]).toBe(
			'2025-03-14,123,US0378331005,"Apple, Inc.",,US,1,1.5,1.62,0.23,0.24,US,,AAPL-2025-03-14',
		);
	});

	it("generates the trade and derivative CSVs", () => {
		expect(generateKdvpCsv([])).toBe("");
		expect(generateIfiCsv([])).toBe("");
	});
});
