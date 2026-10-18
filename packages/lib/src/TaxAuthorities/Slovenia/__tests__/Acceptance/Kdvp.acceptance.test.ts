import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

// What eDavki receives in Doh-KDVP (shares) for each input.
describe("Slovenia, Doh-KDVP", () => {
	describe("everyday cases", () => {
		test("5 EDF shares bought and sold in 2022 (IBKR), FIFO", async () => {
			const stockTrade = TestKit.ibkr.stockTrade;
			const imported = Scenario.pipeline.run(stockTrade.readInputs());

			const report = await Scenario.pipeline.generate(imported, {
				report: SlovenianReportTypeId.KDVP,
				year: stockTrade.year,
				lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
				taxpayer: Fixtures.taxpayer,
				info: Scenario.config.infoProvider(Fixtures.lookups),
			});

			await expect(report.xml).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpFifo.xmlPath);
			await expect(report.csv).toMatchFileSnapshot(stockTrade.expected.slovenia.kdvpFifo.csvPath);
		});

		test("5 EDF shares bought and sold in 2022 (IBKR), the broker's lots", async () => {
			const stockTrade = TestKit.ibkr.stockTrade;
			const imported = Scenario.pipeline.run(stockTrade.readInputs());

			const report = await Scenario.pipeline.generate(imported, {
				report: SlovenianReportTypeId.KDVP,
				year: stockTrade.year,
				lotMatching: TaxAuthorityLotMatchingMethod.PROVIDED,
				taxpayer: Fixtures.taxpayer,
				info: Scenario.config.infoProvider(Fixtures.lookups),
			});

			await expect(report.xml).toMatchFileSnapshot(
				stockTrade.expected.slovenia.kdvpProvided.xmlPath,
			);
			await expect(report.csv).toMatchFileSnapshot(
				stockTrade.expected.slovenia.kdvpProvided.csvPath,
			);
		});
	});

	describe("edge cases", () => {
		// A regression from a real export: IBKR lists the same RKLB executions more than once.
		test("RKLB executions the IBKR export repeats are reported once (2024, FIFO)", async () => {
			const duplicatingTrades = TestKit.ibkr.duplicatingTrades;
			const imported = Scenario.pipeline.run(duplicatingTrades.readInputs());

			const report = await Scenario.pipeline.generate(imported, {
				report: SlovenianReportTypeId.KDVP,
				year: duplicatingTrades.year,
				lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
				taxpayer: Fixtures.taxpayer,
				info: Scenario.config.infoProvider(Fixtures.lookups),
			});

			await expect(report.xml).toMatchFileSnapshot(
				duplicatingTrades.expected.slovenia.kdvpFifo.xmlPath,
			);
			await expect(report.csv).toMatchFileSnapshot(
				duplicatingTrades.expected.slovenia.kdvpFifo.csvPath,
			);
		});

		// SMCI split 10 for 1 on 2024-09-30 and changed ISIN (an IBKR "FI" corporate action). The 4
		// shares bought before it become 40, and with 15 bought after it, the 55 sold close the
		// position. The export is hand-written around the anonymised split rows of
		// CorporateActionsTwoRows.xml.
		test("SMCI shares bought before its 10-for-1 split count ten times (2024, FIFO)", async () => {
			const split = TestKit.ibkr.split;
			const imported = Scenario.pipeline.run(split.readInputs());

			const report = await Scenario.pipeline.generate(imported, {
				report: SlovenianReportTypeId.KDVP,
				year: split.year,
				lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
				taxpayer: Fixtures.taxpayer,
				info: Scenario.config.infoProvider(Fixtures.lookups),
			});

			await expect(report.xml).toMatchFileSnapshot(split.expected.slovenia.kdvpFifo.xmlPath);
			await expect(report.csv).toMatchFileSnapshot(split.expected.slovenia.kdvpFifo.csvPath);
		});

		// StockTrade's export given twice: the report must equal StockTrade's own.
		test("5 EDF shares in two overlapping exports are reported once (2022, FIFO)", async () => {
			const overlappingExports = TestKit.ibkr.overlappingExports;
			const imported = Scenario.pipeline.run(overlappingExports.readInputs());

			const report = await Scenario.pipeline.generate(imported, {
				report: SlovenianReportTypeId.KDVP,
				year: overlappingExports.year,
				lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
				taxpayer: Fixtures.taxpayer,
				info: Scenario.config.infoProvider(Fixtures.lookups),
			});

			await expect(report.xml).toMatchFileSnapshot(
				overlappingExports.expected.slovenia.kdvpFifo.xmlPath,
			);
			await expect(report.csv).toMatchFileSnapshot(
				overlappingExports.expected.slovenia.kdvpFifo.csvPath,
			);
		});
	});
});
