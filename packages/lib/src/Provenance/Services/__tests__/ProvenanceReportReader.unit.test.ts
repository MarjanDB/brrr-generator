import { OptionRight } from "@brrr/Core/Models/Instrument/OptionRight";
import { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceDetail } from "@brrr/Provenance/Models/ProvenanceDetail";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceEventKind } from "@brrr/Provenance/Models/ProvenanceEventKind";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ProvenanceStage } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceLegSide } from "@brrr/Provenance/Models/ProvenanceLegSide";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { ReportInstrumentKind } from "@brrr/Provenance/Models/ReportInstrumentKind";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceReportReader } from "@brrr/Provenance/Services/ProvenanceReportReader";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";

const stage = ProvenanceStage.Schema.parse("Test");

test("a share lists its events by date, its broker lots, its matched lots with their two lines, and what was left out", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const grouping = {};
	const sell = {};
	const open = {};
	const buy = {};
	const brokerLot = {};
	const matched = {};
	const legBuy = {};
	const legSell = {};
	const lineBuy = {};
	const lineSell = {};
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US1 · ACME", {
		[ProvenanceField.ISIN]: "US1",
		[ProvenanceField.TICKER]: "ACME",
	});
	graph.node(sell, ProvenanceNodeKind.EVENT, "stock sold s1 · -10 ACME", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.SOLD,
		[ProvenanceField.DATE]: "2024-03-10",
	});
	graph.node(open, ProvenanceNodeKind.EVENT, "stock bought b2 · 3 ACME", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.ACQUIRED,
		[ProvenanceField.DATE]: "2024-05-01",
	});
	graph.node(buy, ProvenanceNodeKind.EVENT, "stock bought b1 · 10 ACME", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.ACQUIRED,
		[ProvenanceField.DATE]: "2024-01-10",
	});
	graph.node(brokerLot, ProvenanceNodeKind.LOT, "lot L1 · 10 ACME", {
		[ProvenanceField.ACQUIRED_DATE]: "2024-01-10",
	});
	graph.node(matched, ProvenanceNodeKind.MATCHED_LOT, "matched lot b1 → s1 · 10", {});
	graph.node(legBuy, ProvenanceNodeKind.LEG, "leg b1 · 10", {
		[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.ACQUIRED,
	});
	graph.node(legSell, ProvenanceNodeKind.LEG, "leg s1 · -10", {
		[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.SOLD,
	});
	graph.node(lineBuy, ProvenanceNodeKind.REPORT_LINE, "DOH_KDVP bought", {});
	graph.node(lineSell, ProvenanceNodeKind.REPORT_LINE, "DOH_KDVP sold", {});
	graph.derive([sell, open, buy, brokerLot], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([buy, sell], matched, ProvenanceChange.MATCHED, stage, null);
	graph.derive([matched], legSell, ProvenanceChange.MATCHED, stage, null);
	graph.derive([matched], legBuy, ProvenanceChange.MATCHED, stage, null);
	graph.derive([legBuy, grouping], lineBuy, ProvenanceChange.REPORTED, stage, null);
	graph.derive([legSell, grouping], lineSell, ProvenanceChange.REPORTED, stage, null);
	graph.drop(open, DropReason.POSITION_OPEN, stage, null);
	graph.drop(
		brokerLot,
		DropReason.NOT_USED,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.LOT_MATCHING_IGNORES_BROKER_LOTS,
			values: { [ProvenanceDetailValue.LOT_MATCHING_METHOD]: TaxAuthorityLotMatchingMethod.FIFO },
		}),
	);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.shares).toHaveLength(1);
	const share = reading.shares[0];
	expect(share.kind).toEqual(ReportInstrumentKind.SHARE);
	expect(share.node).toBe(graph.nodeOf(grouping));
	expect(share.events).toHaveLength(3);
	expect(share.events[0].node).toBe(graph.nodeOf(buy));
	expect(share.events[1].node).toBe(graph.nodeOf(sell));
	expect(share.events[2].node).toBe(graph.nodeOf(open));
	expect(share.events[2].leftOut).toHaveLength(1);
	expect(share.events[2].leftOut[0].drop.reason).toEqual(DropReason.POSITION_OPEN);
	expect(share.events[2].leftOut[0].category).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(share.brokerLots).toHaveLength(1);
	expect(share.brokerLots[0].leftOut[0].drop.reason).toEqual(DropReason.NOT_USED);
	expect(share.matchedLots).toHaveLength(1);
	expect(share.matchedLots[0].acquired.leg).toBe(graph.nodeOf(legBuy));
	expect(share.matchedLots[0].acquired.line).toBe(graph.nodeOf(lineBuy));
	expect(share.matchedLots[0].sold.leg).toBe(graph.nodeOf(legSell));
	expect(share.matchedLots[0].sold.line).toBe(graph.nodeOf(lineSell));
	expect(share.lines).toHaveLength(2);
	expect(share.notInReport).toEqual(2);
	expect(reading.withoutLines).toHaveLength(0);
	expect(reading.totals.lines).toEqual(2);
	expect(reading.totals.notInReport).toEqual(2);
	expect(reading.totals.needsALook).toEqual(0);
	expect(reading.totals.warnings).toEqual(0);
});

test("option contracts are listed under their underlying, each its own entry, by expiry then strike", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const spxPut = {};
	const spxCall = {};
	const aaplCall = {};
	const spxPutEvent = {};
	const spxCallEvent = {};
	const aaplCallEvent = {};
	const spxPutSum = {};
	const spxCallSum = {};
	const aaplCallSum = {};
	const spxPutLine = {};
	const spxCallLine = {};
	const aaplCallLine = {};
	graph.node(spxPut, ProvenanceNodeKind.GROUPING, "grouping SPX put", {
		[ProvenanceField.TICKER]: "SPX   241220P05000000",
		[ProvenanceField.UNDERLYING_SYMBOL]: "SPX",
		[ProvenanceField.EXPIRY]: "2024-12-20",
		[ProvenanceField.STRIKE]: "5000",
		[ProvenanceField.OPTION_RIGHT]: OptionRight.PUT,
	});
	graph.node(spxCall, ProvenanceNodeKind.GROUPING, "grouping SPX call", {
		[ProvenanceField.TICKER]: "SPX   241220C04900000",
		[ProvenanceField.UNDERLYING_SYMBOL]: "SPX",
		[ProvenanceField.EXPIRY]: "2024-12-20",
		[ProvenanceField.STRIKE]: "4900",
		[ProvenanceField.OPTION_RIGHT]: OptionRight.CALL,
	});
	graph.node(aaplCall, ProvenanceNodeKind.GROUPING, "grouping AAPL call", {
		[ProvenanceField.TICKER]: "AAPL  240621C00200000",
		[ProvenanceField.UNDERLYING_SYMBOL]: "AAPL",
		[ProvenanceField.EXPIRY]: "2024-06-21",
		[ProvenanceField.STRIKE]: "200",
		[ProvenanceField.OPTION_RIGHT]: OptionRight.CALL,
	});
	graph.node(spxPutEvent, ProvenanceNodeKind.EVENT, "option sold spx put", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.SOLD,
		[ProvenanceField.DATE]: "2024-10-01",
	});
	graph.node(spxCallEvent, ProvenanceNodeKind.EVENT, "option sold spx call", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.SOLD,
		[ProvenanceField.DATE]: "2024-10-02",
	});
	graph.node(aaplCallEvent, ProvenanceNodeKind.EVENT, "option sold aapl call", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.SOLD,
		[ProvenanceField.DATE]: "2024-04-02",
	});
	graph.node(spxPutSum, ProvenanceNodeKind.SUM, "sum spx put", {});
	graph.node(spxCallSum, ProvenanceNodeKind.SUM, "sum spx call", {});
	graph.node(aaplCallSum, ProvenanceNodeKind.SUM, "sum aapl call", {});
	graph.node(spxPutLine, ProvenanceNodeKind.REPORT_LINE, "D_IFI spx put", {});
	graph.node(spxCallLine, ProvenanceNodeKind.REPORT_LINE, "D_IFI spx call", {});
	graph.node(aaplCallLine, ProvenanceNodeKind.REPORT_LINE, "D_IFI aapl call", {});
	graph.derive([spxPutEvent], spxPut, ProvenanceChange.GROUPED, stage, null);
	graph.derive([spxCallEvent], spxCall, ProvenanceChange.GROUPED, stage, null);
	graph.derive([aaplCallEvent], aaplCall, ProvenanceChange.GROUPED, stage, null);
	graph.derive([spxPutEvent], spxPutSum, ProvenanceChange.SUMMED, stage, null);
	graph.derive([spxCallEvent], spxCallSum, ProvenanceChange.SUMMED, stage, null);
	graph.derive([aaplCallEvent], aaplCallSum, ProvenanceChange.SUMMED, stage, null);
	graph.derive([spxPutSum], spxPutLine, ProvenanceChange.REPORTED, stage, null);
	graph.derive([spxCallSum], spxCallLine, ProvenanceChange.REPORTED, stage, null);
	graph.derive([aaplCallSum], aaplCallLine, ProvenanceChange.REPORTED, stage, null);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.shares).toHaveLength(0);
	expect(reading.optionUnderlyings).toHaveLength(2);
	expect(reading.optionUnderlyings[0].underlyingSymbol).toEqual("AAPL");
	expect(reading.optionUnderlyings[0].contracts).toHaveLength(1);
	expect(reading.optionUnderlyings[1].underlyingSymbol).toEqual("SPX");
	expect(reading.optionUnderlyings[1].contracts).toHaveLength(2);
	expect(reading.optionUnderlyings[1].contracts[0].node).toBe(graph.nodeOf(spxCall));
	expect(reading.optionUnderlyings[1].contracts[1].node).toBe(graph.nodeOf(spxPut));
	expect(reading.optionUnderlyings[1].contracts[0].kind).toEqual(
		ReportInstrumentKind.OPTION_CONTRACT,
	);
});

test("a dividend payer lists its dividend and withholding, its line, and the warning on the line", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const grouping = {};
	const dividend = {};
	const withholding = {};
	const sum = {};
	const line = {};
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping FR1 · TTE", {
		[ProvenanceField.ISIN]: "FR1",
		[ProvenanceField.TICKER]: "TTE",
	});
	graph.node(dividend, ProvenanceNodeKind.EVENT, "dividend d1 · TTE", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.DIVIDEND,
		[ProvenanceField.DATE]: "2022-04-02",
	});
	graph.node(withholding, ProvenanceNodeKind.EVENT, "withholding tax d2 · TTE", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.WITHHOLDING_TAX,
		[ProvenanceField.DATE]: "2022-04-02",
	});
	graph.node(sum, ProvenanceNodeKind.SUM, "action sum 1", {});
	graph.node(line, ProvenanceNodeKind.REPORT_LINE, "DOH_DIV 2022-04-02", {});
	graph.derive([dividend, withholding], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([dividend, withholding], sum, ProvenanceChange.SUMMED, stage, null);
	graph.derive([sum], line, ProvenanceChange.REPORTED, stage, null);
	graph.warn(
		line,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
			values: { [ProvenanceDetailValue.ISIN]: "FR1" },
		}),
	);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.shares).toHaveLength(0);
	expect(reading.dividendPayers).toHaveLength(1);
	const payer = reading.dividendPayers[0];
	expect(payer.kind).toEqual(ReportInstrumentKind.DIVIDEND_PAYER);
	expect(payer.events).toHaveLength(2);
	expect(payer.matchedLots).toHaveLength(0);
	expect(payer.lines).toHaveLength(1);
	expect(payer.lines[0]).toBe(graph.nodeOf(line));
	expect(payer.warnings).toHaveLength(1);
	expect(payer.warnings[0].detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	expect(reading.totals.warnings).toEqual(1);
	expect(reading.totals.lines).toEqual(1);
});

test("an instrument the report touched but gave no line goes to the ones without lines", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const grouping = {};
	const open = {};
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US1 · ACME", {
		[ProvenanceField.TICKER]: "ACME",
	});
	graph.node(open, ProvenanceNodeKind.EVENT, "stock bought b1 · 3 ACME", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.ACQUIRED,
		[ProvenanceField.DATE]: "2024-05-01",
	});
	graph.derive([open], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.drop(open, DropReason.POSITION_OPEN, stage, null);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.shares).toHaveLength(0);
	expect(reading.withoutLines).toHaveLength(1);
	expect(reading.withoutLines[0].node).toBe(graph.nodeOf(grouping));
	expect(reading.withoutLines[0].lines).toHaveLength(0);
	expect(reading.totals.notInReport).toEqual(1);
});

test("an instrument whose items the report did nothing with is not listed", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const grouping = {};
	const buy = {};
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US1 · ACME", {
		[ProvenanceField.TICKER]: "ACME",
	});
	graph.node(buy, ProvenanceNodeKind.EVENT, "stock bought b1 · 10 ACME", {
		[ProvenanceField.EVENT_KIND]: ProvenanceEventKind.ACQUIRED,
		[ProvenanceField.DATE]: "2024-01-10",
	});
	graph.derive([buy], grouping, ProvenanceChange.GROUPED, stage, null);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.shares).toHaveLength(0);
	expect(reading.dividendPayers).toHaveLength(0);
	expect(reading.optionUnderlyings).toHaveLength(0);
	expect(reading.withoutLines).toHaveLength(0);
});

test("after a corporate action only the grouping that replaced the others is listed, with the action found through the grouping it replaced", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const oldGrouping = {};
	const split = {};
	const scaledFrom = {};
	const merged = {};
	const oldTrade = {};
	const scaledTrade = {};
	graph.node(oldGrouping, ProvenanceNodeKind.GROUPING, "grouping US1 · SMCI.OLD", {
		[ProvenanceField.TICKER]: "SMCI.OLD",
	});
	graph.node(split, ProvenanceNodeKind.CORPORATE_ACTION, "SPLIT SMCI.OLD → SMCI (4 → 40)", {
		[ProvenanceField.CORPORATE_ACTION_KIND]: "SPLIT",
		[ProvenanceField.SPLIT_BEFORE]: "4",
		[ProvenanceField.SPLIT_AFTER]: "40",
	});
	graph.node(scaledFrom, ProvenanceNodeKind.GROUPING, "grouping US1 · SMCI.OLD", {
		[ProvenanceField.TICKER]: "SMCI.OLD",
	});
	graph.node(merged, ProvenanceNodeKind.GROUPING, "grouping US2 · SMCI", {
		[ProvenanceField.ISIN]: "US2",
		[ProvenanceField.TICKER]: "SMCI",
	});
	graph.node(oldTrade, ProvenanceNodeKind.EVENT, "stock bought t1 · 4 SMCI", {
		[ProvenanceField.DATE]: "2024-09-01",
	});
	graph.node(scaledTrade, ProvenanceNodeKind.EVENT, "stock bought t1 · 40 SMCI", {
		[ProvenanceField.DATE]: "2024-09-01",
	});
	graph.derive([oldTrade], oldGrouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([oldTrade, split], scaledTrade, ProvenanceChange.SPLIT, stage, "4 → 40");
	graph.derive([oldGrouping, split], scaledFrom, ProvenanceChange.SPLIT, stage, "4 → 40");
	graph.derive([scaledFrom], merged, ProvenanceChange.SPLIT, stage, "4 → 40");
	graph.derive([scaledTrade], merged, ProvenanceChange.GROUPED, stage, null);
	graph.drop(scaledTrade, DropReason.POSITION_OPEN, stage, null);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.withoutLines).toHaveLength(1);
	expect(reading.withoutLines[0].node).toBe(graph.nodeOf(merged));
	expect(reading.withoutLines[0].events).toHaveLength(1);
	expect(reading.withoutLines[0].events[0].node).toBe(graph.nodeOf(scaledTrade));
	expect(reading.withoutLines[0].corporateActions).toHaveLength(1);
	expect(reading.withoutLines[0].corporateActions[0]).toBe(graph.nodeOf(split));
});

test("what the import dropped needs a look, whatever instrument it was near", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const file = {};
	const row = {};
	graph.node(file, ProvenanceNodeKind.FILE, "broken.xml", {});
	graph.node(row, ProvenanceNodeKind.ROW, "Trade 7 · ES", {});
	graph.derive([file], row, ProvenanceChange.CONTAINS, stage, null);
	graph.drop(
		file,
		DropReason.UNREADABLE,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.FILE_ERROR,
			values: { [ProvenanceDetailValue.ERROR]: "Unexpected end of file" },
		}),
	);
	graph.drop(
		row,
		DropReason.NOT_SUPPORTED,
		stage,
		new ProvenanceDetail({
			kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
			values: { [ProvenanceDetailValue.ASSET_CLASS]: "FUT" },
		}),
	);

	const reading = new ProvenanceReportReader().read(graph);

	expect(reading.needsALook).toHaveLength(2);
	expect(reading.needsALook[0].subject).toBe(graph.nodeOf(file));
	expect(reading.needsALook[0].category).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(reading.needsALook[1].subject).toBe(graph.nodeOf(row));
	expect(reading.needsALook[1].drop.reason).toEqual(DropReason.NOT_SUPPORTED);
	expect(reading.totals.needsALook).toEqual(2);
	expect(reading.totals.notInReport).toEqual(0);
	expect(reading.shares).toHaveLength(0);
});

test("a matched lot whose legs closed outside the period is one thing left out and has no lines", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const grouping = {};
	const buy = {};
	const sell = {};
	const matched = {};
	const legBuy = {};
	const legSell = {};
	graph.node(grouping, ProvenanceNodeKind.GROUPING, "grouping US1 · ACME", {
		[ProvenanceField.TICKER]: "ACME",
	});
	graph.node(buy, ProvenanceNodeKind.EVENT, "stock bought b1 · 10 ACME", {
		[ProvenanceField.DATE]: "2022-01-10",
	});
	graph.node(sell, ProvenanceNodeKind.EVENT, "stock sold s1 · -10 ACME", {
		[ProvenanceField.DATE]: "2022-03-10",
	});
	graph.node(matched, ProvenanceNodeKind.MATCHED_LOT, "matched lot b1 → s1 · 10", {});
	graph.node(legBuy, ProvenanceNodeKind.LEG, "leg b1 · 10", {
		[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.ACQUIRED,
	});
	graph.node(legSell, ProvenanceNodeKind.LEG, "leg s1 · -10", {
		[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.SOLD,
	});
	graph.derive([buy, sell], grouping, ProvenanceChange.GROUPED, stage, null);
	graph.derive([buy, sell], matched, ProvenanceChange.MATCHED, stage, null);
	graph.derive([matched], legBuy, ProvenanceChange.MATCHED, stage, null);
	graph.derive([matched], legSell, ProvenanceChange.MATCHED, stage, null);
	const closed = new ProvenanceDetail({
		kind: ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD,
		values: { [ProvenanceDetailValue.DATE]: "2022-03-10" },
	});
	graph.drop(legBuy, DropReason.OUTSIDE_PERIOD, stage, closed);
	graph.drop(legSell, DropReason.OUTSIDE_PERIOD, stage, closed);

	const reading = new ProvenanceReportReader().read(graph);

	const instrument = reading.withoutLines[0];
	expect(instrument.matchedLots).toHaveLength(1);
	expect(instrument.matchedLots[0].acquired.line).toBeNull();
	expect(instrument.matchedLots[0].sold.line).toBeNull();
	expect(instrument.matchedLots[0].acquired.leftOut[0].subject).toBe(graph.nodeOf(matched));
	expect(instrument.matchedLots[0].acquired.leftOut[0].category).toEqual(
		DropCategory.NOT_IN_THIS_REPORT,
	);
	expect(instrument.notInReport).toEqual(1);
	expect(reading.totals.notInReport).toEqual(1);
});
