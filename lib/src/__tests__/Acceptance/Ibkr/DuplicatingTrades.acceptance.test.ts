import { Scenario } from "@brrr/__tests__/support/Scenario";
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
		});

		await Scenario.pipeline.expectToMatch(
			report,
			duplicatingTrades.expectedReport("slovenia/2024/kdvp-fifo"),
		);
	});

	test("4 buys and 4 sales, each once", () => {
		const items = new KdvpReportGenerator(Scenario.pipeline.eventsProcessor()).convert(
			Scenario.config.report(2024),
			events.groupings,
		);
		const quantities = items.flatMap((item) =>
			item.items.flatMap((line) => line.events.map((event) => event.quantity)),
		);

		expect(quantities).toEqual([10, 40, 50, 100, -10, -40, -50, -100]);
	});
});
