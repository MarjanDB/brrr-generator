import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { EDavkiProvenanceField } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiProvenanceField";
import { SlovenianReportTypeId } from "@brrr/TaxAuthorities/Slovenia/Models/SlovenianReportTypeId";
import { TestKit } from "@brrr/test-cases";

// The facts each node carries in `fields`, read back from the golden cases through the public pipeline.

test("Ibkr/StockTrade, DOH_KDVP: events, lot, grouping, legs and lines carry their facts", async () => {
	const stockTrade = TestKit.ibkr.stockTrade;
	const imported = Scenario.pipeline.run(stockTrade.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: stockTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});
	const grouping = imported.events.groupings[0];
	// Without membership edges: from an event, the first child must be its matched lot, not its grouping.
	const walker = new ProvenanceWalker(report.provenance, [ProvenanceChange.GROUPED]);

	const buy = imported.provenance.nodeOf(grouping.stockTrades[0]).fields;
	expect(buy[ProvenanceField.EVENT_KIND]).toEqual("ACQUIRED");
	expect(buy[ProvenanceField.ASSET_CLASS]).toEqual("STOCK");
	expect(buy[ProvenanceField.DATE]).toEqual("2022-02-22");
	expect(buy[ProvenanceField.QUANTITY]).toEqual("5");
	expect(buy[ProvenanceField.PRICE]).toEqual("8.02");
	expect(buy[ProvenanceField.CURRENCY]).toEqual("EUR");
	expect(buy[ProvenanceField.TRANSACTION_ID]).toEqual("241234985");
	const lot = imported.provenance.nodeOf(grouping.stockTaxLots[0]).fields;
	expect(lot[ProvenanceField.ACQUIRED_DATE]).toEqual("2022-02-22");
	expect(lot[ProvenanceField.SOLD_DATE]).toEqual("2022-03-24");
	expect(lot[ProvenanceField.QUANTITY]).toEqual("5");
	const groupingFields = imported.provenance.nodeOf(grouping).fields;
	expect(groupingFields[ProvenanceField.ISIN]).toEqual("FR0010242511");
	expect(groupingFields[ProvenanceField.TICKER]).toEqual("EDF");
	const matched = walker.children(report.provenance.nodeOf(grouping.stockTrades[0]))[0].to;
	expect(matched.fields[ProvenanceField.QUANTITY]).toEqual("5");
	const [acquiredLeg, soldLeg] = walker.children(matched).map((edge) => edge.to);
	expect(acquiredLeg.fields[ProvenanceField.LEG_SIDE]).toEqual("ACQUIRED");
	expect(acquiredLeg.fields[ProvenanceField.QUANTITY]).toEqual("5");
	expect(soldLeg.fields[ProvenanceField.LEG_SIDE]).toEqual("SOLD");
	expect(soldLeg.fields[ProvenanceField.QUANTITY]).toEqual("-5");
	const boughtLine = walker.children(acquiredLeg)[0].to.fields;
	expect(boughtLine[EDavkiProvenanceField.BOUGHT_ON]).toEqual("2022-02-22");
	expect(boughtLine[EDavkiProvenanceField.GAIN_TYPE]).toEqual("B");
	expect(boughtLine[EDavkiProvenanceField.QUANTITY]).toEqual("5");
	expect(boughtLine[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("8.02");
	expect(boughtLine[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("40.099999999999994");
	expect(boughtLine[EDavkiProvenanceField.COMMISSIONS]).toEqual("-3");
	const soldLine = walker.children(soldLeg)[0].to.fields;
	expect(soldLine[EDavkiProvenanceField.SOLD_ON]).toEqual("2022-03-24");
	expect(soldLine[EDavkiProvenanceField.QUANTITY]).toEqual("-5");
	expect(soldLine[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("8.554");
	expect(soldLine[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("-42.77");
	expect(soldLine[EDavkiProvenanceField.COMMISSIONS]).toEqual("-1.25");
});

test("Ibkr/Split, DOH_KDVP: the corporate action and a split trade carry their facts", async () => {
	const split = TestKit.ibkr.split;
	const imported = Scenario.pipeline.run(split.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.KDVP,
		year: split.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});

	const action = imported.provenance.nodeOf(imported.events.identifierRelationships[0]).fields;
	expect(action[ProvenanceField.CORPORATE_ACTION_KIND]).toEqual("SPLIT");
	expect(action[ProvenanceField.FROM_ISIN]).toEqual("US86800U1043");
	expect(action[ProvenanceField.TO_ISIN]).toEqual("US86800U3023");
	expect(action[ProvenanceField.FROM_TICKER]).toEqual("SMCI.OLD");
	expect(action[ProvenanceField.TO_TICKER]).toEqual("SMCI");
	expect(action[ProvenanceField.SPLIT_BEFORE]).toEqual("4");
	expect(action[ProvenanceField.SPLIT_AFTER]).toEqual("40");
	const trade = report.provenance
		.nodes()
		.find((node) => node.label === "stock bought 900000301 · 30 SMCI");
	expect(trade?.fields[ProvenanceField.QUANTITY]).toEqual("30");
	expect(trade?.fields[ProvenanceField.DATE]).toEqual("2024-08-05");
	expect(trade?.fields[ProvenanceField.TRANSACTION_ID]).toEqual("900000301");
});

test("Ibkr/OptionTrade, D_IFI: the derivative grouping carries the contract terms", async () => {
	const optionTrade = TestKit.ibkr.optionTrade;
	const imported = Scenario.pipeline.run(optionTrade.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.IFI,
		year: optionTrade.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});
	const grouping = imported.events.groupings[0];
	const derivativeGrouping = grouping.derivativeGroupings[0];
	const walker = new ProvenanceWalker(report.provenance, [ProvenanceChange.GROUPED]);

	const option = imported.provenance.nodeOf(derivativeGrouping).fields;
	expect(option[ProvenanceField.ISIN]).toEqual("US0378331005");
	expect(option[ProvenanceField.TICKER]).toEqual("AAPL  231222C00202500");
	expect(option[ProvenanceField.ASSET_CLASS]).toEqual("OPTION");
	expect(option[ProvenanceField.UNDERLYING_SYMBOL]).toEqual("AAPL");
	expect(option[ProvenanceField.EXPIRY]).toEqual("2023-12-22");
	expect(option[ProvenanceField.STRIKE]).toEqual("202.5");
	expect(option[ProvenanceField.OPTION_RIGHT]).toEqual("CALL");
	expect(option[ProvenanceField.MULTIPLIER]).toEqual("100");
	const beside = imported.provenance.nodeOf(grouping).fields;
	expect(beside[ProvenanceField.UNDERLYING_SYMBOL]).toBeUndefined();
	expect(beside[ProvenanceField.ISIN]).toEqual("US0378331005");
	const boughtTrade = derivativeGrouping.derivativeTrades[0];
	const bought = imported.provenance.nodeOf(boughtTrade).fields;
	expect(bought[ProvenanceField.CURRENCY]).toEqual("USD");
	expect(bought[ProvenanceField.QUANTITY]).toEqual("1");
	expect(bought[ProvenanceField.DATE]).toEqual("2023-12-14");
	const matched = walker.children(report.provenance.nodeOf(boughtTrade))[0].to;
	const acquiredLeg = walker.children(matched)[0].to;
	const boughtLine = walker.children(acquiredLeg)[0].to.fields;
	expect(boughtLine[EDavkiProvenanceField.BOUGHT_ON]).toEqual("2023-12-14");
	expect(boughtLine[EDavkiProvenanceField.QUANTITY]).toEqual("1");
});

test("Ibkr/Dividends, DOH_DIV: cash events, the day sum and the line carry their facts", async () => {
	const dividends = TestKit.ibkr.dividends;
	const imported = Scenario.pipeline.run(dividends.readInputs());
	const report = await Scenario.pipeline.generate(imported, {
		report: SlovenianReportTypeId.DIV,
		year: dividends.year,
		lotMatching: TaxAuthorityLotMatchingMethod.FIFO,
		taxpayer: Fixtures.taxpayer,
		info: Scenario.config.infoProvider(Fixtures.lookups),
	});
	const grouping = imported.events.groupings[0];
	const dividend = imported.provenance.nodeOf(grouping.cashTransactions[0]).fields;
	expect(dividend[ProvenanceField.EVENT_KIND]).toEqual("DIVIDEND");
	const withholding = imported.provenance.nodeOf(grouping.cashTransactions[1]).fields;
	expect(withholding[ProvenanceField.EVENT_KIND]).toEqual("WITHHOLDING_TAX");
	const daySum = report.provenance.nodes().find((node) => node.label === "day sum 2022-04-02 · 1");
	expect(daySum?.fields[EDavkiProvenanceField.DATE_RECEIVED]).toEqual("2022-04-02");
	const line = report.provenance
		.nodes()
		.find((node) => node.label === "DOH_DIV 2022-04-02 · FR0000120271 · 2.64");
	expect(line?.fields[EDavkiProvenanceField.DATE_RECEIVED]).toEqual("2022-04-02");
	expect(line?.fields[EDavkiProvenanceField.PAYER_ID]).toEqual("FR0000120271");
	expect(line?.fields[EDavkiProvenanceField.DIVIDEND_AMOUNT]).toEqual("2.64");
});
