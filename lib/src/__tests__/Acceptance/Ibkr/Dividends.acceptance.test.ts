import { Lookups } from "@brrr/__tests__/Acceptance/Lookups";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const dividends = TestKit.ibkr.dividends;

describe("IBKR: a TotalEnergies dividend in 2022 with French withholding tax", () => {
	const { events } = Scenario.pipeline.run(dividends.readInputs());

	test("DIV 2022", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: 2022,
			info: Scenario.config.infoProvider(Lookups),
		});
		const expected = dividends.expectedReport("slovenia/2022/div");

		await expect(report.xml).toMatchFileSnapshot(expected.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(expected.csvPath);
	});
});
