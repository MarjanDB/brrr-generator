import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";
import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.ts";
import { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Transforms/Extract.ts";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transforms/Transform.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { ApplyIdentifierRelationshipsService } from "@brrr/Core/FinancialEvents/ApplyIdentifierRelationshipsService.ts";
import { CompanyLookupProvider, CountryLookupProvider } from "@brrr/InfoProviders/InfoLookupProvider.ts";
import { TaxAuthorityLotMatchingMethod, TaxPayerType } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { TaxAuthorityConfiguration, TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { SlovenianTaxAuthorityReportTypes } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import { SlovenianTaxAuthorityProvider } from "@brrr/TaxAuthorities/Slovenia/SlovenianTaxAuthorityProvider.ts";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Div/DivReportGenerator.ts";
import { IfiReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Ifi/IfiReportGenerator.ts";

const xmlPath = new URL("./DuplicatingTrades.xml", import.meta.url).pathname;

Deno.test("SloveniaIssues - testDuplicatingTrades - 8 rows with correct quantities", () => {
	const xmlContent = Deno.readTextFileSync(xmlPath);

	const ibkrProvider = new IbkrBrokerageExportProvider(new IbkrExtractService(), new IbkrTransformService());
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

	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const provider = new SlovenianTaxAuthorityProvider(
		taxPayerInfo,
		reportConfig,
		new ApplyIdentifierRelationshipsService(),
		new KdvpReportGenerator(processor),
		new DivReportGenerator(new CompanyLookupProvider(), new CountryLookupProvider()),
		new IfiReportGenerator(processor),
	);
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
