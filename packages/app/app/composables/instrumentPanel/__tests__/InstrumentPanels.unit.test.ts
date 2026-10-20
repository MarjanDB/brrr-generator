import {
	DropReason,
	IdentifierChangeType,
	OptionRight,
	ProvenanceChange,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceStage,
	ReportInstrumentKind,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { InstrumentPanels } from "~/composables/instrumentPanel/instrumentPanels";
import { ColorIntent } from "~/types/ui";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { NodeLooks } from "~/utils/nodeLooks";
import { ReportInstruments } from "~/utils/reportInstruments";

const stage = ProvenanceStage.Schema.parse("Test");

describe("the download panel's sections", () => {
	test("the panel lists the reading's stocks, contracts, payers and instruments without lines, in the reader's order", () => {
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

		const sections = InstrumentPanels.build(b.reading());

		expect(sections.stocks).toHaveLength(1);
		expect(sections.stocks[0]?.ticker).toEqual("ACME");
		expect(sections.stocks[0]?.isin).toEqual("US0000000001");
		expect(sections.stocks[0]?.lineCount).toEqual(2);
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

		const sections = InstrumentPanels.build(b.reading());
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

	test("a stock rebuilt by a split has a corporate action and a split chip", () => {
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

		const sections = InstrumentPanels.build(b.reading());
		const [stock] = sections.stocks;
		assert(stock !== undefined);
		const chips = ReportInstruments.chipsOf(stock.instrument);

		expect(sections.stocks).toHaveLength(1);
		expect(sections.stocks[0]?.hasCorporateAction).toEqual(true);
		expect(chips).toHaveLength(1);
		expect(chips[0]?.kind).toEqual(IdentifierChangeType.SPLIT);
		expect(chips[0]?.before).toEqual("4");
		expect(chips[0]?.after).toEqual("40");
	});

	test("a stock without a corporate action says so", () => {
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

		const sections = InstrumentPanels.build(b.reading());
		const [stock] = sections.stocks;
		assert(stock !== undefined);

		expect(stock.hasCorporateAction).toEqual(false);
		expect(ReportInstruments.chipsOf(stock.instrument)).toHaveLength(0);
	});
});

describe("searching the panel", () => {
	test("a query that names an underlying keeps all its contracts and drops the stocks", () => {
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
		const sections = InstrumentPanels.build(b.reading());

		const found = InstrumentPanels.filter(sections, "spx");

		expect(found.stocks).toHaveLength(0);
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
		const sections = InstrumentPanels.build(b.reading());

		const found = InstrumentPanels.filter(sections, "p04900");

		expect(found.underlyings).toHaveLength(1);
		expect(found.underlyings[0]?.symbol).toEqual("SPX");
		expect(found.underlyings[0]?.contracts).toHaveLength(1);
		expect(found.underlyings[0]?.contracts[0]?.contract?.right).toEqual(OptionRight.PUT);
	});

	test("an ISIN finds the stock, whatever the case", () => {
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
		const sections = InstrumentPanels.build(b.reading());

		const found = InstrumentPanels.filter(sections, "us0000000001");

		expect(found.stocks).toHaveLength(1);
		expect(found.stocks[0]?.ticker).toEqual("ACME");
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
		const sections = InstrumentPanels.build(b.reading());

		const found = InstrumentPanels.filter(sections, "  ");

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
		const sections = InstrumentPanels.build(b.reading());

		const found = InstrumentPanels.filter(sections, "nothing");

		expect(found.stocks).toHaveLength(0);
		expect(found.underlyings).toHaveLength(0);
		expect(found.payers).toHaveLength(0);
		expect(found.withoutLines).toHaveLength(0);
		expect(InstrumentPanels.first(found)).toBeNull();
	});

	test("the first entry is the first stock when there is one", () => {
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

		const first = InstrumentPanels.first(InstrumentPanels.build(b.reading()));

		expect(first?.ticker).toEqual("ACME");
	});
});

describe("finding an instrument's entry", () => {
	test("an instrument is found among the stocks, and an unknown one is not found", () => {
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
		const [stock] = reading.stocks;
		const [stranger] = other.reading().withoutLines;
		assert(stock !== undefined);
		assert(stranger !== undefined);

		const sections = InstrumentPanels.build(reading);

		expect(InstrumentPanels.find(sections, stock)?.ticker).toEqual("ACME");
		expect(InstrumentPanels.find(sections, stranger)).toBeNull();
	});
});

describe("the monogram", () => {
	test("a ticker always gets the same intent, never the neutral one", () => {
		expect(NodeLooks.monogramIntent("ACME")).toEqual(NodeLooks.monogramIntent("ACME"));
		expect(NodeLooks.monogramIntent("ACME")).not.toEqual(ColorIntent.NEUTRAL);
		expect(NodeLooks.monogramIntent("TTE")).not.toEqual(ColorIntent.NEUTRAL);
	});

	test("two tickers have the intents they were given", () => {
		expect(NodeLooks.monogramIntent("ACME")).toEqual(ColorIntent.WARNING);
		expect(NodeLooks.monogramIntent("TTE")).toEqual(ColorIntent.DANGER);
	});

	test("a ticker of up to four characters is its own text", () => {
		expect(NodeLooks.monogramText("AAPL")).toEqual("AAPL");
	});

	test("a longer ticker is cut to three characters", () => {
		expect(NodeLooks.monogramText("SMCI.OLD")).toEqual("SMC");
	});
});

describe("the warning count of a panel entry", () => {
	test("an instrument whose report line was warned about carries the count, and one without carries none", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
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
		const summed = b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });
		b.graph.warn(
			summed.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "FR0000120271" },
			}),
		);
		const eni = b.instrument({ ticker: "ENI", isin: "IT0003132476" });
		const eniDividend = b.dividend({
			file,
			instrument: eni,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-02",
			amount: "10",
			currency: "EUR",
			label: "dividend ENI",
		});
		b.sumInto({ instrument: eni, events: [eniDividend], dateReceived: "2024-04-02" });

		const sections = InstrumentPanels.build(b.reading());

		expect(sections.payers[0]?.ticker).toEqual("ENI");
		expect(sections.payers[0]?.warningCount).toEqual(0);
		expect(sections.payers[1]?.ticker).toEqual("TTE");
		expect(sections.payers[1]?.warningCount).toEqual(1);
	});
});

describe("the same instrument in a report made again", () => {
	test("is found by its kind, ticker and ISIN, though its nodes are new", () => {
		const first = new GraphBuilder();
		const firstFile = first.file({ name: "U1.xml" });
		const firstNope = first.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const firstDividend = first.dividend({
			file: firstFile,
			instrument: firstNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		first.sumInto({ instrument: firstNope, events: [firstDividend], dateReceived: "2022-04-01" });
		const second = new GraphBuilder();
		const secondFile = second.file({ name: "U1.xml" });
		const secondTte = second.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tteDividend = second.dividend({
			file: secondFile,
			instrument: secondTte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-02",
			amount: "2.64",
			currency: "EUR",
			label: "dividend TTE",
		});
		second.sumInto({ instrument: secondTte, events: [tteDividend], dateReceived: "2022-04-02" });
		const secondNope = second.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const secondDividend = second.dividend({
			file: secondFile,
			instrument: secondNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		second.sumInto({
			instrument: secondNope,
			events: [secondDividend],
			dateReceived: "2022-04-01",
		});
		const before = InstrumentPanels.build(first.reading());
		const after = InstrumentPanels.build(second.reading());
		const nope = before.payers[0];
		assert(nope !== undefined);

		const same = InstrumentPanels.sameEntryIn(after, nope);

		expect(same?.ticker).toEqual("NOPE");
		expect(same?.instrument).toBe(after.payers[0]?.instrument);
		expect(same?.instrument).not.toBe(nope.instrument);
	});

	test("is none when the new report doesn't have it", () => {
		const first = new GraphBuilder();
		const firstFile = first.file({ name: "U1.xml" });
		const firstNope = first.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const firstDividend = first.dividend({
			file: firstFile,
			instrument: firstNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		first.sumInto({ instrument: firstNope, events: [firstDividend], dateReceived: "2022-04-01" });
		const second = new GraphBuilder();
		const secondFile = second.file({ name: "U1.xml" });
		const secondTte = second.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tteDividend = second.dividend({
			file: secondFile,
			instrument: secondTte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-02",
			amount: "2.64",
			currency: "EUR",
			label: "dividend TTE",
		});
		second.sumInto({ instrument: secondTte, events: [tteDividend], dateReceived: "2022-04-02" });
		const nope = InstrumentPanels.build(first.reading()).payers[0];
		assert(nope !== undefined);

		expect(InstrumentPanels.sameEntryIn(InstrumentPanels.build(second.reading()), nope)).toBeNull();
	});
});
