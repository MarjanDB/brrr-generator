import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { KdvpReportGenerator } from "@brrr/TaxAuthorities/Slovenia/ReportGeneration/Kdvp/KdvpReportGenerator";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const duplicatingTrades = TestKit.ibkr.duplicatingTrades;

// A regression from a real export: IBKR lists the same RKLB executions more than once, and each
// must reach KDVP exactly once.
describe("IBKR: RKLB trades in 2024 that the export repeats", () => {
	const { events } = Scenario.pipeline.run(duplicatingTrades.readInputs());

	test("KDVP 2024, FIFO", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: 2024,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});
		const expected = duplicatingTrades.expectedReport("slovenia/2024/kdvp-fifo");

		await expect(report.xml).toMatchFileSnapshot(expected.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(expected.csvPath);
	});

	test("4 buys and 4 sales, each once", () => {
		const generator = new KdvpReportGenerator(Scenario.pipeline.eventsProcessor());
		const items = generator.convert(
			Scenario.config.report(2024, TaxAuthorityLotMatchingMethod.FIFO),
			events.groupings,
		);
		const kdvpEvents = items.flatMap((item) => item.items.flatMap((line) => line.events));

		expect(kdvpEvents.length).toEqual(8);
		expect(kdvpEvents[0].quantity).toEqual(10);
		expect(kdvpEvents[1].quantity).toEqual(40);
		expect(kdvpEvents[2].quantity).toEqual(50);
		expect(kdvpEvents[3].quantity).toEqual(100);
		expect(kdvpEvents[4].quantity).toEqual(-10);
		expect(kdvpEvents[5].quantity).toEqual(-40);
		expect(kdvpEvents[6].quantity).toEqual(-50);
		expect(kdvpEvents[7].quantity).toEqual(-100);
	});
});
