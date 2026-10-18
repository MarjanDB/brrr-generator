import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { renderProvenance } from "@brrr/__tests__/support/ProvenanceSnapshot";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

// What generating each expected report recorded, with the import it came from: every file, row and
// object, the report's lines, and why anything was dropped.

test("Ibkr/StockTrade, DOH_KDVP, FIFO", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		stockTrade.expected.slovenia.kdvpFifo.provenancePath,
	);
});

test("Ibkr/StockTrade, DOH_KDVP, PROVIDED", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.PROVIDED,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		stockTrade.expected.slovenia.kdvpProvided.provenancePath,
	);
});

test("Ibkr/OptionTrade, D_IFI, FIFO", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;
	const imported = Scenario.pipeline.run(optionTrade.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.IFI,
		year: optionTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		optionTrade.expected.slovenia.ifiFifo.provenancePath,
	);
});

test("Ibkr/Dividends, DOH_DIV", async () => {
	const dividends = TestKit.ibkr.dividends;
	const imported = Scenario.pipeline.run(dividends.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.DIV,
		year: dividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		dividends.expected.slovenia.div.provenancePath,
	);
});

test("Ibkr/PaymentInLieuOfDividends, DOH_DIV", async () => {
	const paymentInLieuOfDividends = TestKit.ibkr.paymentInLieuOfDividends;
	const imported = Scenario.pipeline.run(paymentInLieuOfDividends.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.DIV,
		year: paymentInLieuOfDividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		paymentInLieuOfDividends.expected.slovenia.div.provenancePath,
	);
});

test("Ibkr/DuplicatingTrades, DOH_KDVP, FIFO", async () => {
	const duplicatingTrades = TestKit.ibkr.duplicatingTrades;
	const imported = Scenario.pipeline.run(duplicatingTrades.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: duplicatingTrades.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		duplicatingTrades.expected.slovenia.kdvpFifo.provenancePath,
	);
});

test("Ibkr/Split, DOH_KDVP, FIFO", async () => {
	const split = TestKit.ibkr.split;
	const imported = Scenario.pipeline.run(split.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: split.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		split.expected.slovenia.kdvpFifo.provenancePath,
	);
});

test("Ibkr/OverlappingExports, DOH_KDVP, FIFO", async () => {
	const overlappingExports = TestKit.ibkr.overlappingExports;
	const imported = Scenario.pipeline.run(overlappingExports.readInputs());

	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: overlappingExports.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	await expect(renderProvenance(report.provenance)).toMatchFileSnapshot(
		overlappingExports.expected.slovenia.kdvpFifo.provenancePath,
	);
});
