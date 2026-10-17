import { Scenario } from "@brrr/__tests__/support/Scenario";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const optionTrade = TestKit.ibkr.optionTrade;

describe("IBKR: one AAPL call bought on 2023-12-14 and sold on 2023-12-20", () => {
	const { events } = Scenario.pipeline.run(optionTrade.readInputs());

	test("IFI 2023, FIFO", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.IFI,
			year: 2023,
		});

		await Scenario.pipeline.expectToMatch(
			report,
			optionTrade.expectedReport("slovenia/2023/ifi-fifo"),
		);
	});
});
