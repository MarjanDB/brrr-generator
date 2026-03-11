import { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Extract.ts";
import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider.ts";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform.ts";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor.ts";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher.ts";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor.ts";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator.ts";
import type { ValidDateTime } from "@brrr/Utils/DateTime.ts";
import { assertEquals } from "@std/assert";
import { DateTime } from "luxon";

const xmlPath = new URL("./DuplicatingTrades.xml", import.meta.url).pathname;

Deno.test("SloveniaIssues - testDuplicatingTrades - 8 rows with correct quantities", () => {
	const xmlContent = Deno.readTextFileSync(xmlPath);

	const ibkrProvider = new IbkrBrokerageExportProvider(new IbkrExtractService(), new IbkrTransformService());
	const stagingEvents = ibkrProvider.loadAndTransform([xmlContent]);

	const groupingProcessor = new StagingFinancialGroupingProcessor();
	const financialEvents = groupingProcessor.processStagingFinancialEvents(stagingEvents);

	const reportConfig: TaxAuthorityConfiguration = {
		fromDate: DateTime.fromISO("2024-01-01") as ValidDateTime,
		toDate: DateTime.fromISO("2025-01-01") as ValidDateTime,
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const processor = new FinancialEventsProcessor(null, new LotMatcher());
	const generator = new KdvpReportGenerator(processor);
	const items = generator.convert(reportConfig, financialEvents.groupings);
	const events = items.flatMap((item) => item.items.flatMap((line) => line.events));

	assertEquals(
		events.length,
		8,
		"Expected 8 rows, as there are 3 buys and 3 sells, but 2 of the buys are smaller than a single sell, so there are 4 matching lots",
	);

	assertEquals(events[0].quantity, 10);
	assertEquals(events[1].quantity, 40);
	assertEquals(events[2].quantity, 50);
	assertEquals(events[3].quantity, 100);
	assertEquals(events[4].quantity, -10);
	assertEquals(events[5].quantity, -40);
	assertEquals(events[6].quantity, -50);
	assertEquals(events[7].quantity, -100);
});
