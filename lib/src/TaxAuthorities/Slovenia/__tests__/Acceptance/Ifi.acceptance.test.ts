import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

// What eDavki receives in D-IFI (derivatives) for each input.
describe("Slovenia, D-IFI", () => {
	test("one AAPL call bought and sold in December 2023 (IBKR), FIFO", async () => {
		const optionTrade = TestKit.ibkr.optionTrade;
		const { events } = Scenario.pipeline.run(optionTrade.readInputs());

		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.IFI,
			year: optionTrade.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(optionTrade.expected.slovenia.ifiFifo.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(optionTrade.expected.slovenia.ifiFifo.csvPath);
	});
});
