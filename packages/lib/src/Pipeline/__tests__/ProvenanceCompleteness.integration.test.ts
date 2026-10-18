import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { linesFromNowhere, rowsGoingNowhere } from "@brrr/__tests__/support/ProvenanceCompleteness";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

// Every case's inputs are reported three ways from one import (KDVP, DIV and IFI): across all of them,
// every report line comes from a broker row, and every broker row reaches a line or a drop.

test("Ibkr/StockTrade: every line comes from a row, and every row reaches a line or a drop", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());
	const options = {
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/OptionTrade: every line comes from a row, and every row reaches a line or a drop", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;
	const imported = Scenario.pipeline.run(optionTrade.readInputs());
	const options = {
		year: optionTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/Dividends: every line comes from a row, and every row reaches a line or a drop", async () => {
	const dividends = TestKit.ibkr.dividends;
	const imported = Scenario.pipeline.run(dividends.readInputs());
	const options = {
		year: dividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/PaymentInLieuOfDividends: every line comes from a row, and every row reaches a line or a drop", async () => {
	const paymentInLieuOfDividends = TestKit.ibkr.paymentInLieuOfDividends;
	const imported = Scenario.pipeline.run(paymentInLieuOfDividends.readInputs());
	const options = {
		year: paymentInLieuOfDividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/DuplicatingTrades: every line comes from a row, and every row reaches a line or a drop", async () => {
	const duplicatingTrades = TestKit.ibkr.duplicatingTrades;
	const imported = Scenario.pipeline.run(duplicatingTrades.readInputs());
	const options = {
		year: duplicatingTrades.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/Split: every line comes from a row, and every row reaches a line or a drop", async () => {
	const split = TestKit.ibkr.split;
	const imported = Scenario.pipeline.run(split.readInputs());
	const options = {
		year: split.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});

test("Ibkr/OverlappingExports: every line comes from a row, and every row reaches a line or a drop", async () => {
	const overlappingExports = TestKit.ibkr.overlappingExports;
	const imported = Scenario.pipeline.run(overlappingExports.readInputs());
	const options = {
		year: overlappingExports.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	};

	const kdvp = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.KDVP,
	});
	const div = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.DIV,
	});
	const ifi = await Scenario.pipeline.generate(imported, {
		...options,
		report: SlovenianReportTypeId.IFI,
	});

	const reports = [kdvp.provenance, div.provenance, ifi.provenance];
	expect(rowsGoingNowhere(imported.provenance, reports)).toEqual([]);
	expect(linesFromNowhere(reports)).toEqual([]);
});
