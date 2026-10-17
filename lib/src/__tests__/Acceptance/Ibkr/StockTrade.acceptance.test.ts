import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/ConfigurationProvider";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes";
import { TestKit } from "@brrr/test-cases";

const stockTrade = TestKit.ibkr.stockTrade;

describe("IBKR: 5 EDF shares bought on 2022-02-22 and sold on 2022-03-24", () => {
	const { events } = Scenario.pipeline.run(stockTrade.readInputs());

	test("KDVP, FIFO", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: stockTrade.year,
			lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpFifo.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpFifo.csvPath);
	});

	test("KDVP, the broker's lots", async () => {
		const report = await Scenario.pipeline.generate(events, {
			report: SlovenianReportTypeId.KDVP,
			year: stockTrade.year,
			lotMatching: TaxAuthorityLotMatchingMethod.PROVIDED,
			taxPayer: Fixtures.taxPayer,
			info: Scenario.config.infoProvider(Fixtures.lookups),
		});

		await expect(report.xml).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpProvided.xmlPath);
		await expect(report.csv).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpProvided.csvPath);
	});
});
