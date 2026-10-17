import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const optionTrade = TestKit.ibkr.optionTrade;

describe("IBKR: one AAPL call bought on 2023-12-14 and sold on 2023-12-20", () => {
	const { events } = Scenario.pipeline.run(optionTrade.readInputs());

	test("IFI, FIFO", async () => {
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
