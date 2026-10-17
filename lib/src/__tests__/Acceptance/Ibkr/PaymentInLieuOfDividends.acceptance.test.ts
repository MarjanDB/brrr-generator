import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const paymentInLieu = TestKit.ibkr.paymentInLieuOfDividends;

describe("IBKR: a McDonald's payment in lieu of dividend in 2024 with US withholding tax", () => {
	const { events } = Scenario.pipeline.run(paymentInLieu.readInputs());

	test("DIV", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: paymentInLieu.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(paymentInLieu.expected.slovenia.div.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(paymentInLieu.expected.slovenia.div.csvPath);
	});
});
