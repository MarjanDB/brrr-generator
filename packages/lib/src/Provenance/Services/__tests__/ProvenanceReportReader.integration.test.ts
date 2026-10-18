import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import { OptionRight } from "@brrr/Core/Models/Instrument/OptionRight";
import { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceEventKind } from "@brrr/Provenance/Models/ProvenanceEventKind";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ReportInstrumentKind } from "@brrr/Provenance/Models/ReportInstrumentKind";
import { ProvenanceReportReader } from "@brrr/Provenance/Services/ProvenanceReportReader";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

// The reader on the provenance of real generated reports.

test("Ibkr/StockTrade, DOH_KDVP: one share with its lot, a matched pair and two lines", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const reading = new ProvenanceReportReader().read(report.provenance);

	expect(reading.shares).toHaveLength(1);
	const share = reading.shares[0];
	expect(share.node.fields[ProvenanceField.TICKER]).toEqual("EDF");
	expect(share.node.fields[ProvenanceField.ISIN]).toEqual("FR0010242511");
	expect(share.events).toHaveLength(2);
	expect(share.events[0].node.label).toEqual("stock bought 241234985 · 5 EDF");
	expect(share.events[1].node.label).toEqual("stock sold 262720557 · -5 EDF");
	expect(share.brokerLots).toHaveLength(1);
	expect(share.brokerLots[0].leftOut[0].drop.reason).toEqual(DropReason.NOT_USED);
	expect(share.brokerLots[0].leftOut[0].category).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(share.matchedLots).toHaveLength(1);
	expect(share.matchedLots[0].acquired.line?.label).toEqual(
		"DOH_KDVP bought 2022-02-22 · 5 FR0010242511",
	);
	expect(share.matchedLots[0].sold.line?.label).toEqual(
		"DOH_KDVP sold 2022-03-24 · -5 FR0010242511",
	);
	expect(share.lines).toHaveLength(2);
	expect(share.corporateActions).toHaveLength(0);
	expect(reading.optionUnderlyings).toHaveLength(0);
	expect(reading.dividendPayers).toHaveLength(0);
	expect(reading.withoutLines).toHaveLength(0);
	expect(reading.needsALook).toHaveLength(0);
	expect(reading.totals.lines).toEqual(2);
	expect(reading.totals.notInReport).toEqual(1);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});

test("Ibkr/Split, DOH_KDVP: the merged share with its split, five events in date order and four matched lots", async () => {
	const split = TestKit.ibkr.split;
	const imported = Scenario.pipeline.run(split.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: split.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const reading = new ProvenanceReportReader().read(report.provenance);

	expect(reading.shares).toHaveLength(1);
	const share = reading.shares[0];
	expect(share.node.fields[ProvenanceField.TICKER]).toEqual("SMCI");
	expect(share.node.fields[ProvenanceField.ISIN]).toEqual("US86800U3023");
	expect(share.events).toHaveLength(5);
	expect(share.events[0].node.fields[ProvenanceField.DATE]).toEqual("2024-08-05");
	expect(share.events[1].node.fields[ProvenanceField.DATE]).toEqual("2024-09-10");
	expect(share.events[2].node.fields[ProvenanceField.DATE]).toEqual("2024-11-05");
	expect(share.events[3].node.fields[ProvenanceField.DATE]).toEqual("2024-12-10");
	expect(share.events[4].node.fields[ProvenanceField.DATE]).toEqual("2024-12-20");
	expect(share.corporateActions).toHaveLength(1);
	expect(share.corporateActions[0].fields[ProvenanceField.CORPORATE_ACTION_KIND]).toEqual(
		IdentifierChangeType.SPLIT,
	);
	expect(share.corporateActions[0].fields[ProvenanceField.SPLIT_BEFORE]).toEqual("4");
	expect(share.corporateActions[0].fields[ProvenanceField.SPLIT_AFTER]).toEqual("40");
	expect(share.matchedLots).toHaveLength(4);
	expect(share.lines).toHaveLength(8);
	expect(share.notInReport).toEqual(0);
	expect(share.brokerLots).toHaveLength(0);
	expect(reading.totals.lines).toEqual(8);
	expect(reading.totals.notInReport).toEqual(0);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});

test("Ibkr/OptionTrade, D_IFI: the option contract under its underlying, with its lot and two lines", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;
	const imported = Scenario.pipeline.run(optionTrade.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.IFI,
		year: optionTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const reading = new ProvenanceReportReader().read(report.provenance);

	expect(reading.shares).toHaveLength(0);
	expect(reading.optionUnderlyings).toHaveLength(1);
	expect(reading.optionUnderlyings[0].underlyingSymbol).toEqual("AAPL");
	expect(reading.optionUnderlyings[0].contracts).toHaveLength(1);
	const contract = reading.optionUnderlyings[0].contracts[0];
	expect(contract.kind).toEqual(ReportInstrumentKind.OPTION_CONTRACT);
	expect(contract.node.fields[ProvenanceField.TICKER]).toEqual("AAPL  231222C00202500");
	expect(contract.node.fields[ProvenanceField.EXPIRY]).toEqual("2023-12-22");
	expect(contract.node.fields[ProvenanceField.STRIKE]).toEqual("202.5");
	expect(contract.node.fields[ProvenanceField.OPTION_RIGHT]).toEqual(OptionRight.CALL);
	expect(contract.node.fields[ProvenanceField.MULTIPLIER]).toEqual("100");
	expect(contract.events).toHaveLength(2);
	expect(contract.brokerLots).toHaveLength(1);
	expect(contract.brokerLots[0].leftOut[0].drop.reason).toEqual(DropReason.NOT_USED);
	expect(contract.matchedLots).toHaveLength(1);
	expect(contract.matchedLots[0].acquired.line?.label).toEqual(
		"D_IFI bought 2023-12-14 · 1 AAPL  231222C00202500",
	);
	expect(contract.matchedLots[0].sold.line?.label).toEqual(
		"D_IFI sold 2023-12-20 · -1 AAPL  231222C00202500",
	);
	expect(reading.totals.lines).toEqual(2);
	expect(reading.totals.notInReport).toEqual(1);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});

test("Ibkr/Dividends, DOH_DIV: one payer with its dividend and withholding and one line", async () => {
	const dividends = TestKit.ibkr.dividends;
	const imported = Scenario.pipeline.run(dividends.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.DIV,
		year: dividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const reading = new ProvenanceReportReader().read(report.provenance);

	expect(reading.shares).toHaveLength(0);
	expect(reading.dividendPayers).toHaveLength(1);
	const payer = reading.dividendPayers[0];
	expect(payer.kind).toEqual(ReportInstrumentKind.DIVIDEND_PAYER);
	expect(payer.node.fields[ProvenanceField.TICKER]).toEqual("TTE");
	expect(payer.node.fields[ProvenanceField.ISIN]).toEqual("FR0000120271");
	expect(payer.events).toHaveLength(2);
	expect(payer.events[0].node.fields[ProvenanceField.EVENT_KIND]).toEqual(
		ProvenanceEventKind.DIVIDEND,
	);
	expect(payer.events[1].node.fields[ProvenanceField.EVENT_KIND]).toEqual(
		ProvenanceEventKind.WITHHOLDING_TAX,
	);
	expect(payer.matchedLots).toHaveLength(0);
	expect(payer.lines).toHaveLength(1);
	expect(payer.lines[0].label).toEqual("DOH_DIV 2022-04-02 · FR0000120271 · 2.64");
	expect(reading.totals.lines).toEqual(1);
	expect(reading.totals.notInReport).toEqual(0);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});

test("Ibkr/StockTrade, import only: nothing generated, nothing listed", () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());

	const reading = new ProvenanceReportReader().read(imported.provenance);

	expect(reading.shares).toHaveLength(0);
	expect(reading.optionUnderlyings).toHaveLength(0);
	expect(reading.dividendPayers).toHaveLength(0);
	expect(reading.withoutLines).toHaveLength(0);
	expect(reading.needsALook).toHaveLength(0);
	expect(reading.totals.lines).toEqual(0);
	expect(reading.totals.notInReport).toEqual(0);
});

test("Ibkr/DuplicatingTrades, DOH_KDVP: the open positions stay listed, as not in this report", async () => {
	const duplicatingTrades = TestKit.ibkr.duplicatingTrades;
	const imported = Scenario.pipeline.run(duplicatingTrades.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: duplicatingTrades.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const reading = new ProvenanceReportReader().read(report.provenance);

	expect(reading.shares).toHaveLength(1);
	const share = reading.shares[0];
	expect(share.node.fields[ProvenanceField.TICKER]).toEqual("RKLB");
	expect(share.node.fields[ProvenanceField.ISIN]).toEqual("US7731221062");
	expect(share.events).toHaveLength(8);
	expect(share.matchedLots).toHaveLength(4);
	expect(share.lines).toHaveLength(8);
	expect(share.notInReport).toEqual(2);
	expect(share.events[6].node.label).toEqual("stock bought 3347474516 · 2 RKLB");
	expect(share.events[6].leftOut[0].drop.reason).toEqual(DropReason.POSITION_OPEN);
	expect(share.events[6].leftOut[0].category).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(share.events[7].node.label).toEqual("stock bought 3347474530 · 8 RKLB");
	expect(share.events[7].leftOut[0].drop.reason).toEqual(DropReason.POSITION_OPEN);
	expect(share.events[7].leftOut[0].category).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(reading.totals.lines).toEqual(8);
	expect(reading.totals.notInReport).toEqual(2);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});
