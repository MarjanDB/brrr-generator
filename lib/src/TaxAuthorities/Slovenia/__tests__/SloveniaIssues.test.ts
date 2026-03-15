import fs from "node:fs";
import { IbkrExtractService } from "@brrr/Brokerages/Ibkr/Extract";
import { IbkrBrokerageExportProvider } from "@brrr/Brokerages/Ibkr/IbkrBrokerageExportProvider";
import { IbkrTransformService } from "@brrr/Brokerages/Ibkr/Transform";
import { FinancialEventsProcessor } from "@brrr/Core/FinancialEvents/FinancialEventsProcessor";
import { LotMatcher } from "@brrr/Core/LotMatching/LotMatcher";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";

const xmlPath = new URL("./DuplicatingTrades.xml", import.meta.url).pathname;

test("SloveniaIssues - testDuplicatingTrades - 8 rows with correct quantities", () => {
	const xmlContent = fs.readFileSync(xmlPath, "utf-8");

	const ibkrProvider = new IbkrBrokerageExportProvider(
		new IbkrExtractService(),
		new IbkrTransformService(),
	);
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

	expect(events.length).toEqual(8);

	expect(events[0].quantity).toEqual(10);
	expect(events[1].quantity).toEqual(40);
	expect(events[2].quantity).toEqual(50);
	expect(events[3].quantity).toEqual(100);
	expect(events[4].quantity).toEqual(-10);
	expect(events[5].quantity).toEqual(-40);
	expect(events[6].quantity).toEqual(-50);
	expect(events[7].quantity).toEqual(-100);
});
