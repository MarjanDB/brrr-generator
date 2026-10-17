import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const dividends = TestKit.ibkr.dividends;

describe("IBKR: a TotalEnergies dividend in 2022 with French withholding tax", () => {
	const { events } = Scenario.pipeline.run(dividends.readInputs());

	test("DIV", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: dividends.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(dividends.expected.slovenia.div.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(dividends.expected.slovenia.div.csvPath);
	});
});
