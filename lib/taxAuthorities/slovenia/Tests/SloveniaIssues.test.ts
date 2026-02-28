import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { IbkrBrokerageExportProvider } from "@brrr/brokerages/ibkr/IbkrBrokerageExportProvider.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/core/stagingProcessor/StagingFinancialGroupingProcessor.ts";
import { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/taxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/taxAuthorities/slovenia/schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/taxAuthorities/slovenia/SlovenianTaxAuthorityProvider.ts";

const xmlPath = new URL("./DuplicatingTrades.xml", import.meta.url).pathname;

Deno.test("SloveniaIssues - testDuplicatingTrades - 8 rows with correct quantities", () => {
	const xmlContent = Deno.readTextFileSync(xmlPath);

	const ibkrProvider = new IbkrBrokerageExportProvider();
	const stagingEvents = ibkrProvider.loadAndTransform([xmlContent]);

	const groupingProcessor = new StagingFinancialGroupingProcessor();
	const financialEvents = groupingProcessor.processStagingFinancialEvents(stagingEvents);

	const taxPayerInfo: TaxPayerInfo = {
		taxNumber: "1234567890",
		taxpayerType: TaxPayerType.PHYSICAL_SUBJECT,
		name: "John Doe",
		address1: "123 Main St",
		address2: "Apt 1",
		city: "Anytown",
		postNumber: "12345",
		postName: "Post Office",
		municipalityName: "Anytown Municipality",
		birthDate: DateTime.fromISO("1990-01-01"),
		maticnaStevilka: "1234567890",
		invalidskoPodjetje: false,
		resident: true,
		activityCode: "1234567890",
		activityName: "Anytown Activity",
		countryId: "US",
		countryName: "United States",
	};

	const reportConfig: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2024-01-01"),
		toDate: DateTime.fromISO("2025-01-01"),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const provider = new SlovenianTaxAuthorityProvider(taxPayerInfo, reportConfig);
	const tradeCsv = provider.generateSpreadsheetExport(SlovenianTaxAuthorityReportTypes.DOH_KDVP, financialEvents);

	assertEquals(
		tradeCsv.length,
		8,
		"Expected 8 rows, as there are 3 buys and 3 sells, but 2 of the buys are smaller than a single sell, so there are 4 matching lots",
	);

	assertEquals((tradeCsv[0] as Record<string, unknown>)["quantity"], 10);
	assertEquals((tradeCsv[1] as Record<string, unknown>)["quantity"], 40);
	assertEquals((tradeCsv[2] as Record<string, unknown>)["quantity"], 50);
	assertEquals((tradeCsv[3] as Record<string, unknown>)["quantity"], 100);
	assertEquals((tradeCsv[4] as Record<string, unknown>)["quantity"], -10);
	assertEquals((tradeCsv[5] as Record<string, unknown>)["quantity"], -40);
	assertEquals((tradeCsv[6] as Record<string, unknown>)["quantity"], -50);
	assertEquals((tradeCsv[7] as Record<string, unknown>)["quantity"], -100);
});
