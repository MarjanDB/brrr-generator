import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const stockTrade = TestKit.ibkr.stockTrade;

describe("IBKR: 5 EDF shares bought on 2022-02-22 and sold on 2022-03-24", () => {
	const { events } = Scenario.pipeline.run(stockTrade.readInputs());

	test("KDVP 2022, FIFO", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: 2022,
		});

		await Scenario.pipeline.expectToMatch(
			report,
			stockTrade.expectedReport("slovenia/2022/kdvp-fifo"),
		);
	});

	test("KDVP 2022, the broker's lots", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: 2022,
			lotMatching: TaxAuthorityLotMatchingMethod.PROVIDED,
		});

		await Scenario.pipeline.expectToMatch(
			report,
			stockTrade.expectedReport("slovenia/2022/kdvp-provided"),
		);
	});
});
