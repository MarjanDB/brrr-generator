import { IbkrBuyOrSell } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrBuyOrSell";
import { IbkrCashTransactionType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrCashTransactionType";
import { IbkrActionId, IbkrIsin } from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TestKit } from "@brrr/test-cases";

const { ibkr } = TestKit;
const stockTradeFile = ibkr.stockTrade.inputs.simpleStockTrade.read();
const optionTradeFile = ibkr.optionTrade.inputs.simpleOptionTrade.read();
const corporateActionFile = ibkr.corporateAction.inputs.simpleCorporateAction.read();
const corporateActionsTwoRowsFile =
	ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read();
const dividendsFile = ibkr.dividends.inputs.simpleCashTransactionOfDividends.read();
const paymentInLieuFile =
	ibkr.paymentInLieuOfDividends.inputs.simpleCashTransactionOfPaymentInLieuOfDividends.read();

const service = new IbkrExtractService();

test("stock trades: returns trades and lot", () => {
	const segmented = service.extractFromXML(stockTradeFile, new NullProvenanceRecorder());
	expect(segmented.stockTrades.length).toEqual(2);
	expect(segmented.stockLots.length).toEqual(1);
});

test("stock trades: contains buy and sell event", () => {
	const segmented = service.extractFromXML(stockTradeFile, new NullProvenanceRecorder());
	const buyTrade = segmented.stockTrades[0];
	expect(buyTrade.buyOrSell).toEqual(IbkrBuyOrSell.BUY);
	expect(buyTrade.isin).toEqual("FR0010242511");
	expect(buyTrade.quantity).toEqual(5);
	expect(buyTrade.transactionID).toEqual("241234985");

	const sellTrade = segmented.stockTrades[1];
	expect(sellTrade.buyOrSell).toEqual(IbkrBuyOrSell.SELL);
	expect(sellTrade.isin).toEqual("FR0010242511");
	expect(sellTrade.quantity).toEqual(-5);
	expect(sellTrade.transactionID).toEqual("262720557");
});

test("stock trades: buy event transaction relates to lot", () => {
	const segmented = service.extractFromXML(stockTradeFile, new NullProvenanceRecorder());
	expect(segmented.stockTrades[0].transactionID).toEqual("241234985");
	expect(segmented.stockLots[0].transactionID).toEqual("241234985");
});

test("stock trades: merging deduplicates", () => {
	const s1 = service.extractFromXML(stockTradeFile, new NullProvenanceRecorder());
	const s2 = service.extractFromXML(stockTradeFile, new NullProvenanceRecorder());
	const merged = service.mergeTrades([s1, s2], new NullProvenanceRecorder());
	expect(merged.stockTrades.length).toEqual(2);
});

test("option trades: returns trades and lot", () => {
	const segmented = service.extractFromXML(optionTradeFile, new NullProvenanceRecorder());
	expect(segmented.derivativeTrades.length).toEqual(2);
	expect(segmented.derivativeLots.length).toEqual(1);
});

test("option trades: contains buy and sell event", () => {
	const segmented = service.extractFromXML(optionTradeFile, new NullProvenanceRecorder());
	const buyTrade = segmented.derivativeTrades[0];
	expect(buyTrade.buyOrSell).toEqual(IbkrBuyOrSell.BUY);
	expect(buyTrade.underlyingSecurityID).toEqual("US0378331005");
	expect(buyTrade.quantity).toEqual(1);
	expect(buyTrade.multiplier).toEqual(100);
	expect(buyTrade.transactionID).toEqual("635331370");

	const sellTrade = segmented.derivativeTrades[1];
	expect(sellTrade.buyOrSell).toEqual(IbkrBuyOrSell.SELL);
	expect(sellTrade.quantity).toEqual(-1);
	expect(sellTrade.transactionID).toEqual("639309966");
});

test("option trades: buy event relates to lot", () => {
	const segmented = service.extractFromXML(optionTradeFile, new NullProvenanceRecorder());
	expect(segmented.derivativeTrades[0].transactionID).toEqual("635331370");
	expect(segmented.derivativeLots[0].transactionID).toEqual("635331370");
});

test("option trades: merging deduplicates", () => {
	const s1 = service.extractFromXML(optionTradeFile, new NullProvenanceRecorder());
	const s2 = service.extractFromXML(optionTradeFile, new NullProvenanceRecorder());
	const merged = service.mergeTrades([s1, s2], new NullProvenanceRecorder());
	expect(merged.derivativeTrades.length).toEqual(2);
});

test("corporate actions: returns one corporate action", () => {
	const segmented = service.extractFromXML(corporateActionFile, new NullProvenanceRecorder());
	expect(segmented.derivativeTrades.length).toEqual(0);
	expect(segmented.corporateActions.length).toEqual(1);
});

test("corporate actions: merging deduplicates", () => {
	const s1 = service.extractFromXML(corporateActionFile, new NullProvenanceRecorder());
	const s2 = service.extractFromXML(corporateActionFile, new NullProvenanceRecorder());
	const merged = service.mergeTrades([s1, s2], new NullProvenanceRecorder());
	expect(merged.corporateActions.length).toEqual(1);
});

test("corporate actions two rows: extracts two actions with same actionID", () => {
	const segmented = service.extractFromXML(
		corporateActionsTwoRowsFile,
		new NullProvenanceRecorder(),
	);
	expect(segmented.corporateActions.length).toEqual(2);
	const actionIds = new Set(segmented.corporateActions.map((ca) => ca.actionID));
	expect(actionIds.size).toEqual(1);
	expect(actionIds.has(IbkrActionId.Schema.parse("141913764"))).toEqual(true);
	const isins = new Set(segmented.corporateActions.map((ca) => ca.isin));
	expect(isins.has(IbkrIsin.Schema.parse("US86800U1043"))).toEqual(true);
	expect(isins.has(IbkrIsin.Schema.parse("US86800U3023"))).toEqual(true);
});

test("cash transactions dividends: returns 2 transactions", () => {
	const segmented = service.extractFromXML(dividendsFile, new NullProvenanceRecorder());
	expect(segmented.cashTransactions.length).toEqual(2);
	expect(segmented.corporateActions.length).toEqual(0);
});

test("cash transactions dividends: merging deduplicates", () => {
	const s1 = service.extractFromXML(dividendsFile, new NullProvenanceRecorder());
	const s2 = service.extractFromXML(dividendsFile, new NullProvenanceRecorder());
	const merged = service.mergeTrades([s1, s2], new NullProvenanceRecorder());
	expect(merged.cashTransactions.length).toEqual(2);
});

test("cash transactions dividends: contains dividend and withholding tax", () => {
	const segmented = service.extractFromXML(dividendsFile, new NullProvenanceRecorder());
	const dividend = segmented.cashTransactions[0];
	expect(dividend.transactionID).toEqual("269176073");
	expect(dividend.isin).toEqual("FR0000120271");
	expect(dividend.type).toEqual(IbkrCashTransactionType.DIVIDEND);

	const withholding = segmented.cashTransactions[1];
	expect(withholding.transactionID).toEqual("323614082");
	expect(withholding.isin).toEqual("FR0000120271");
	expect(withholding.type).toEqual(IbkrCashTransactionType.WITHHOLDING_TAX);
});

test("cash transactions payment in lieu: returns 2 transactions", () => {
	const segmented = service.extractFromXML(paymentInLieuFile, new NullProvenanceRecorder());
	expect(segmented.cashTransactions.length).toEqual(2);
});

test("cash transactions payment in lieu: merging deduplicates", () => {
	const s1 = service.extractFromXML(paymentInLieuFile, new NullProvenanceRecorder());
	const s2 = service.extractFromXML(paymentInLieuFile, new NullProvenanceRecorder());
	const merged = service.mergeTrades([s1, s2], new NullProvenanceRecorder());
	expect(merged.cashTransactions.length).toEqual(2);
});

test("cash transactions payment in lieu: contains payment and withholding", () => {
	const segmented = service.extractFromXML(paymentInLieuFile, new NullProvenanceRecorder());
	expect(segmented.cashTransactions[0].transactionID).toEqual("814208300");
	expect(segmented.cashTransactions[0].isin).toEqual("US5801351017");
	expect(segmented.cashTransactions[0].type).toEqual(
		IbkrCashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
	);

	expect(segmented.cashTransactions[1].transactionID).toEqual("814208301");
	expect(segmented.cashTransactions[1].type).toEqual(IbkrCashTransactionType.WITHHOLDING_TAX);
});

test("each row is recorded under its file, then as its parsed record", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const file = ibkr.stockTrade.inputs.simpleStockTrade.read();
	graph.node(file, ProvenanceNodeKind.FILE, file.fileName, {});

	service.extractFromXML(file, graph);

	const walker = new ProvenanceWalker(graph);
	const rows = walker.children(graph.nodeOf(file));
	expect(rows).toHaveLength(3);
	expect(rows[0].change).toEqual(ProvenanceChange.CONTAINS);
	expect(rows[0].to.kind).toEqual(ProvenanceNodeKind.ROW);
	expect(rows[0].to.label).toEqual("Trade 241234985 · EDF");
	expect(rows[0].to.fields.buySell).toEqual("BUY");
	expect(rows[1].to.label).toEqual("Trade 262720557 · EDF");
	expect(rows[2].to.label).toEqual("Lot 241234985 · EDF");
	const parsed = walker.children(rows[0].to);
	expect(parsed).toHaveLength(1);
	expect(parsed[0].change).toEqual(ProvenanceChange.PARSED);
	expect(parsed[0].by).toEqual("IbkrExtractService");
	expect(parsed[0].to.kind).toEqual(ProvenanceNodeKind.RECORD);
	expect(parsed[0].to.label).toEqual("TradeStock 241234985");
});

test("a row of an asset class lib doesn't support is dropped", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stockTrade = ibkr.stockTrade.inputs.simpleStockTrade.read();
	const file = {
		fileName: "futures.xml",
		xml: stockTrade.xml.replace('assetCategory="STK"', 'assetCategory="FUT"'),
	};
	graph.node(file, ProvenanceNodeKind.FILE, file.fileName, {});

	service.extractFromXML(file, graph);

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node.label).toEqual("Trade 241234985 · EDF");
	expect(drops[0].reason).toEqual(DropReason.NOT_SUPPORTED);
	expect(drops[0].detail).toEqual("asset class FUT");
});

test("a file that fails to parse records none of its rows", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const dividends = ibkr.dividends.inputs.simpleCashTransactionOfDividends.read();
	const file = {
		fileName: "damaged.xml",
		xml: dividends.xml.replace('type="Dividends"', 'type="Broker Interest Received"'),
	};
	graph.node(file, ProvenanceNodeKind.FILE, file.fileName, {});

	expect(() => service.extractFromXML(file, graph)).toThrow();
	expect(graph.nodes()).toHaveLength(1);
});

test("a trade in two files leads both rows to the one record kept", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stockTrade = ibkr.stockTrade.inputs.simpleStockTrade.read();
	const first = { fileName: "2022-a.xml", xml: stockTrade.xml };
	const second = { fileName: "2022-b.xml", xml: stockTrade.xml };
	graph.node(first, ProvenanceNodeKind.FILE, first.fileName, {});
	graph.node(second, ProvenanceNodeKind.FILE, second.fileName, {});

	const merged = service.mergeTrades(
		[service.extractFromXML(first, graph), service.extractFromXML(second, graph)],
		graph,
	);

	const walker = new ProvenanceWalker(graph);
	const firstBuyRow = walker.children(graph.nodeOf(first))[0].to;
	const firstBuyRecord = walker.children(firstBuyRow)[0].to;
	const deduplicated = walker.children(firstBuyRecord);
	expect(deduplicated).toHaveLength(1);
	expect(deduplicated[0].change).toEqual(ProvenanceChange.DEDUPLICATED);
	expect(deduplicated[0].to).toBe(graph.nodeOf(merged.stockTrades[0]));
	const firstLotRow = walker.children(graph.nodeOf(first))[2].to;
	const firstLotRecord = walker.children(firstLotRow)[0].to;
	expect(walker.children(firstLotRecord)).toEqual([]);
});
