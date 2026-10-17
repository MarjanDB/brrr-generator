import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const paymentInLieu = TestKit.ibkr.paymentInLieuOfDividends;

describe("IBKR: a McDonald's payment in lieu of dividend in 2024 with US withholding tax", () => {
	const { events } = Scenario.pipeline.run(paymentInLieu.readInputs());

	test("DIV 2024", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: 2024,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});
		const expected = paymentInLieu.expectedReport("slovenia/2024/div");

		await expect(report.xml).toMatchFileSnapshot(expected.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(expected.csvPath);
	});
});
