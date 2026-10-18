import {
	DropReason,
	OptionRight,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceStage,
	ReportInstrumentKind,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { CorporateActionChipKind } from "~/download/labels/CorporateActionChipKind";
import { chipsOf } from "~/download/labels/instrumentLabels";
import { buildPanel } from "~/download/panel/buildPanel";
import { defaultFocus } from "~/download/panel/defaultFocus";
import { filterPanel } from "~/download/panel/filterPanel";
import { findEntry } from "~/download/panel/findEntry";
import { firstEntry } from "~/download/panel/firstEntry";
import { monogramIntent, monogramText } from "~/download/panel/monogramIntent";
import { ColorIntent } from "~/utils/ColorIntent";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the download panel's sections", () => {
	test("the panel lists the reading's shares, contracts, payers and instruments without lines, in the reader's order", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const acmeBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const acmeSell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: acmeBuy,
			sold: acmeSell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const spxCall = b.optionContract({
			occSymbol: "SPX   240621C04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.CALL,
		});
		const callBuy = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "1",
			price: "50",
			currency: "USD",
			label: "buy SPX call",
		});
		const callSell = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-20",
			quantity: "-1",
			price: "60",
			currency: "USD",
			label: "sell SPX call",
		});
		b.match({
			instrument: spxCall,
			acquired: callBuy,
			sold: callSell,
			quantity: "1",
			boughtOn: "2024-02-01",
			soldOn: "2024-02-20",
		});
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });
		const zed = b.instrument({ ticker: "ZED", isin: "US0000000009" });
		const zedBuy = b.trade({
			file,
			instrument: zed,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "7",
			currency: "USD",
			label: "buy ZED",
		});
		b.graph.drop(zedBuy.event, DropReason.POSITION_OPEN, stage, null);

		const sections = buildPanel(b.reading());

		expect(sections.shares).toHaveLength(1);
		expect(sections.shares[0]?.ticker).toEqual("ACME");
		expect(sections.shares[0]?.isin).toEqual("US0000000001");
		expect(sections.shares[0]?.lineCount).toEqual(2);
		expect(sections.underlyings).toHaveLength(1);
		expect(sections.underlyings[0]?.symbol).toEqual("SPX");
		expect(sections.payers).toHaveLength(1);
		expect(sections.payers[0]?.ticker).toEqual("TTE");
		expect(sections.withoutLines).toHaveLength(1);
		expect(sections.withoutLines[0]?.ticker).toEqual("ZED");
		expect(sections.withoutLines[0]?.notInReport).toEqual(1);
	});

	test("an underlying's contracts stay separate rows, each with its own terms", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const spxCall = b.optionContract({
			occSymbol: "SPX   240621C04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.CALL,
		});
		const callBuy = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "1",
			price: "50",
			currency: "USD",
			label: "buy SPX call",
		});
		const callSell = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-20",
			quantity: "-1",
			price: "60",
			currency: "USD",
			label: "sell SPX call",
		});
		b.match({
			instrument: spxCall,
			acquired: callBuy,
			sold: callSell,
			quantity: "1",
			boughtOn: "2024-02-01",
			soldOn: "2024-02-20",
		});
		const spxPut = b.optionContract({
			occSymbol: "SPX   240621P04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.PUT,
		});
		const putBuy = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-02",
			quantity: "1",
			price: "40",
			currency: "USD",
			label: "buy SPX put",
		});
		const putSell = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-21",
			quantity: "-1",
			price: "30",
			currency: "USD",
			label: "sell SPX put",
		});
		b.match({
			instrument: spxPut,
			acquired: putBuy,
			sold: putSell,
			quantity: "1",
			boughtOn: "2024-02-02",
			soldOn: "2024-02-21",
		});

		const sections = buildPanel(b.reading());
		const contracts = sections.underlyings[0]?.contracts ?? [];

		expect(contracts).toHaveLength(2);
		expect(contracts[0]?.kind).toEqual(ReportInstrumentKind.OPTION_CONTRACT);
		expect(contracts[0]?.contract?.right).toEqual(OptionRight.CALL);
		expect(contracts[0]?.contract?.strike).toEqual("4900");
		expect(contracts[0]?.contract?.expiry).toEqual("2024-06-21");
		expect(contracts[0]?.contract?.underlyingSymbol).toEqual("SPX");
		expect(contracts[0]?.contract?.occSymbol).toEqual("SPX   240621C04900000");
		expect(contracts[1]?.contract?.right).toEqual(OptionRight.PUT);
		expect(contracts[1]?.contract?.occSymbol).toEqual("SPX   240621P04900000");
	});

	test("a share rebuilt by a split has a corporate action and a split chip", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const oldAcme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: oldAcme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "4",
			price: "100",
			currency: "USD",
			label: "buy ACME",
		});
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-40",
			price: "11",
			currency: "USD",
			label: "sell ACME",
		});
		const split = b.split({
			trade: buy,
			instrument: acme,
			before: "4",
			after: "40",
			date: "2024-02-01",
		});
		b.graph.derive([oldAcme, split.action], acme, ProvenanceChange.SPLIT, stage, null);
		b.match({
			instrument: acme,
			acquired: { row: buy.row, record: buy.record, staged: buy.staged, event: split.rebuilt },
			sold: sell,
			quantity: "40",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});

		const sections = buildPanel(b.reading());
		const [share] = sections.shares;
		assert(share !== undefined);
		const chips = chipsOf(share.instrument);

		expect(sections.shares).toHaveLength(1);
		expect(sections.shares[0]?.hasCorporateAction).toEqual(true);
		expect(chips).toHaveLength(1);
		expect(chips[0]?.kind).toEqual(CorporateActionChipKind.SPLIT);
		expect(chips[0]?.before).toEqual("4");
		expect(chips[0]?.after).toEqual("40");
	});

	test("a share without a corporate action says so", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});

		const sections = buildPanel(b.reading());
		const [share] = sections.shares;
		assert(share !== undefined);

		expect(share.hasCorporateAction).toEqual(false);
		expect(chipsOf(share.instrument)).toHaveLength(0);
	});
});

describe("the item an instrument opens on", () => {
	test("an instrument with a buy and a sale opens on the sale", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});

		const [instrument] = b.reading().shares;
		assert(instrument !== undefined);

		const focus = defaultFocus(instrument);

		expect(focus).toBe(b.node(sell.event));
	});

	test("an instrument with only a buy opens on the buy", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const zed = b.instrument({ ticker: "ZED", isin: "US0000000009" });
		const buy = b.trade({
			file,
			instrument: zed,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "7",
			currency: "USD",
			label: "buy ZED",
		});
		b.graph.drop(buy.event, DropReason.POSITION_OPEN, stage, null);

		const [instrument] = b.reading().withoutLines;
		assert(instrument !== undefined);

		const focus = defaultFocus(instrument);

		expect(focus).toBe(b.node(buy.event));
	});

	test("a dividend payer opens on the dividend, not the withholding", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tax = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-01",
			amount: "-3",
			currency: "EUR",
			label: "tax TTE",
		});
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [tax, dividend], dateReceived: "2024-04-01" });

		const [instrument] = b.reading().dividendPayers;
		assert(instrument !== undefined);

		const focus = defaultFocus(instrument);

		expect(focus).toBe(b.node(dividend.event));
	});
});

describe("searching the panel", () => {
	test("a query that names an underlying keeps all its contracts and drops the shares", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const acmeBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const acmeSell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: acmeBuy,
			sold: acmeSell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const spxCall = b.optionContract({
			occSymbol: "SPX   240621C04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.CALL,
		});
		const callBuy = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "1",
			price: "50",
			currency: "USD",
			label: "buy SPX call",
		});
		const callSell = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-20",
			quantity: "-1",
			price: "60",
			currency: "USD",
			label: "sell SPX call",
		});
		b.match({
			instrument: spxCall,
			acquired: callBuy,
			sold: callSell,
			quantity: "1",
			boughtOn: "2024-02-01",
			soldOn: "2024-02-20",
		});
		const spxPut = b.optionContract({
			occSymbol: "SPX   240621P04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.PUT,
		});
		const putBuy = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-02",
			quantity: "1",
			price: "40",
			currency: "USD",
			label: "buy SPX put",
		});
		const putSell = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-21",
			quantity: "-1",
			price: "30",
			currency: "USD",
			label: "sell SPX put",
		});
		b.match({
			instrument: spxPut,
			acquired: putBuy,
			sold: putSell,
			quantity: "1",
			boughtOn: "2024-02-02",
			soldOn: "2024-02-21",
		});
		const sections = buildPanel(b.reading());

		const found = filterPanel(sections, "spx");

		expect(found.shares).toHaveLength(0);
		expect(found.underlyings).toHaveLength(1);
		expect(found.underlyings[0]?.symbol).toEqual("SPX");
		expect(found.underlyings[0]?.contracts).toHaveLength(2);
	});

	test("a query that names one contract keeps its underlying heading and only that contract", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const spxCall = b.optionContract({
			occSymbol: "SPX   240621C04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.CALL,
		});
		const callBuy = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-01",
			quantity: "1",
			price: "50",
			currency: "USD",
			label: "buy SPX call",
		});
		const callSell = b.trade({
			file,
			instrument: spxCall,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-20",
			quantity: "-1",
			price: "60",
			currency: "USD",
			label: "sell SPX call",
		});
		b.match({
			instrument: spxCall,
			acquired: callBuy,
			sold: callSell,
			quantity: "1",
			boughtOn: "2024-02-01",
			soldOn: "2024-02-20",
		});
		const spxPut = b.optionContract({
			occSymbol: "SPX   240621P04900000",
			underlyingSymbol: "SPX",
			expiry: "2024-06-21",
			strike: "4900",
			right: OptionRight.PUT,
		});
		const putBuy = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-02-02",
			quantity: "1",
			price: "40",
			currency: "USD",
			label: "buy SPX put",
		});
		const putSell = b.trade({
			file,
			instrument: spxPut,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-02-21",
			quantity: "-1",
			price: "30",
			currency: "USD",
			label: "sell SPX put",
		});
		b.match({
			instrument: spxPut,
			acquired: putBuy,
			sold: putSell,
			quantity: "1",
			boughtOn: "2024-02-02",
			soldOn: "2024-02-21",
		});
		const sections = buildPanel(b.reading());

		const found = filterPanel(sections, "p04900");

		expect(found.underlyings).toHaveLength(1);
		expect(found.underlyings[0]?.symbol).toEqual("SPX");
		expect(found.underlyings[0]?.contracts).toHaveLength(1);
		expect(found.underlyings[0]?.contracts[0]?.contract?.right).toEqual(OptionRight.PUT);
	});

	test("an ISIN finds the share, whatever the case", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const sections = buildPanel(b.reading());

		const found = filterPanel(sections, "us0000000001");

		expect(found.shares).toHaveLength(1);
		expect(found.shares[0]?.ticker).toEqual("ACME");
	});

	test("a blank query changes nothing", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const sections = buildPanel(b.reading());

		const found = filterPanel(sections, "  ");

		expect(found).toEqual(sections);
	});

	test("a query that matches nothing leaves no section and no first entry", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const sections = buildPanel(b.reading());

		const found = filterPanel(sections, "nothing");

		expect(found.shares).toHaveLength(0);
		expect(found.underlyings).toHaveLength(0);
		expect(found.payers).toHaveLength(0);
		expect(found.withoutLines).toHaveLength(0);
		expect(firstEntry(found)).toBeNull();
	});

	test("the first entry is the first share when there is one", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});

		const first = firstEntry(buildPanel(b.reading()));

		expect(first?.ticker).toEqual("ACME");
	});
});

describe("finding an instrument's entry", () => {
	test("an instrument is found among the shares, and an unknown one is not found", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const other = new GraphBuilder();
		const otherFile = other.file({ name: "U2.xml" });
		const zed = other.instrument({ ticker: "ZED", isin: "US0000000009" });
		const zedBuy = other.trade({
			file: otherFile,
			instrument: zed,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-01",
			quantity: "5",
			price: "7",
			currency: "USD",
			label: "buy ZED",
		});
		other.graph.drop(zedBuy.event, DropReason.POSITION_OPEN, stage, null);
		const reading = b.reading();
		const [share] = reading.shares;
		const [stranger] = other.reading().withoutLines;
		assert(share !== undefined);
		assert(stranger !== undefined);

		const sections = buildPanel(reading);

		expect(findEntry(sections, share)?.ticker).toEqual("ACME");
		expect(findEntry(sections, stranger)).toBeNull();
	});
});

describe("the monogram", () => {
	test("a ticker always gets the same intent, never the neutral one", () => {
		expect(monogramIntent("ACME")).toEqual(monogramIntent("ACME"));
		expect(monogramIntent("ACME")).not.toEqual(ColorIntent.NEUTRAL);
		expect(monogramIntent("TTE")).not.toEqual(ColorIntent.NEUTRAL);
	});

	test("two tickers have the intents they were given", () => {
		expect(monogramIntent("ACME")).toEqual(ColorIntent.WARNING);
		expect(monogramIntent("TTE")).toEqual(ColorIntent.DANGER);
	});

	test("a ticker of up to four characters is its own text", () => {
		expect(monogramText("AAPL")).toEqual("AAPL");
	});

	test("a longer ticker is cut to three characters", () => {
		expect(monogramText("SMCI.OLD")).toEqual("SMC");
	});
});
