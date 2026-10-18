import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

// What eDavki receives in Doh-Div (dividends) for each input.
describe("Slovenia, Doh-Div", () => {
	test("a TotalEnergies dividend with French withholding tax in 2022 (IBKR)", async () => {
		const dividends = TestKit.ibkr.dividends;
		const { events } = Scenario.pipeline.run(dividends.readInputs());

		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: dividends.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxpayer: Fixtures.taxpayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(dividends.expected.slovenia.div.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(dividends.expected.slovenia.div.csvPath);
	});

	test("a McDonald's payment in lieu of dividend with US withholding tax in 2024 (IBKR)", async () => {
		const paymentInLieu = TestKit.ibkr.paymentInLieuOfDividends;
		const { events } = Scenario.pipeline.run(paymentInLieu.readInputs());

		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.DIV,
			year: paymentInLieu.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxpayer: Fixtures.taxpayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(paymentInLieu.expected.slovenia.div.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(paymentInLieu.expected.slovenia.div.csvPath);
	});
});
