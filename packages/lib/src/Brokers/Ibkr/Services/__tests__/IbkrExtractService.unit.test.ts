import { IbkrBuyOrSell } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrBuyOrSell";
import { IbkrCashTransactionType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrCashTransactionType";
import { IbkrActionId, IbkrIsin } from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import { TestKit } from "@brrr/test-cases";

const { ibkr } = TestKit;
const stockTradeXml = ibkr.stockTrade.inputs.simpleStockTrade.read().xml;
const optionTradeXml = ibkr.optionTrade.inputs.simpleOptionTrade.read().xml;
const corporateActionXml = ibkr.corporateAction.inputs.simpleCorporateAction.read().xml;
const corporateActionsTwoRowsXml =
	ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read().xml;
const dividendsXml = ibkr.dividends.inputs.simpleCashTransactionOfDividends.read().xml;
const paymentInLieuXml =
	ibkr.paymentInLieuOfDividends.inputs.simpleCashTransactionOfPaymentInLieuOfDividends.read().xml;

const service = new IbkrExtractService();

test("stock trades: returns trades and lot", () => {
	const segmented = service.extractFromXML(stockTradeXml);
	expect(segmented.stockTrades.length).toEqual(2);
	expect(segmented.stockLots.length).toEqual(1);
});

test("stock trades: contains buy and sell event", () => {
	const segmented = service.extractFromXML(stockTradeXml);
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
	const segmented = service.extractFromXML(stockTradeXml);
	expect(segmented.stockTrades[0].transactionID).toEqual("241234985");
	expect(segmented.stockLots[0].transactionID).toEqual("241234985");
});

test("stock trades: merging deduplicates", () => {
	const s1 = service.extractFromXML(stockTradeXml);
	const s2 = service.extractFromXML(stockTradeXml);
	const merged = service.mergeTrades([s1, s2]);
	expect(merged.stockTrades.length).toEqual(2);
});

test("option trades: returns trades and lot", () => {
	const segmented = service.extractFromXML(optionTradeXml);
	expect(segmented.derivativeTrades.length).toEqual(2);
	expect(segmented.derivativeLots.length).toEqual(1);
});

test("option trades: contains buy and sell event", () => {
	const segmented = service.extractFromXML(optionTradeXml);
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
	const segmented = service.extractFromXML(optionTradeXml);
	expect(segmented.derivativeTrades[0].transactionID).toEqual("635331370");
	expect(segmented.derivativeLots[0].transactionID).toEqual("635331370");
});

test("option trades: merging deduplicates", () => {
	const s1 = service.extractFromXML(optionTradeXml);
	const s2 = service.extractFromXML(optionTradeXml);
	const merged = service.mergeTrades([s1, s2]);
	expect(merged.derivativeTrades.length).toEqual(2);
});

test("corporate actions: returns one corporate action", () => {
	const segmented = service.extractFromXML(corporateActionXml);
	expect(segmented.derivativeTrades.length).toEqual(0);
	expect(segmented.corporateActions.length).toEqual(1);
});

test("corporate actions: merging deduplicates", () => {
	const s1 = service.extractFromXML(corporateActionXml);
	const s2 = service.extractFromXML(corporateActionXml);
	const merged = service.mergeTrades([s1, s2]);
	expect(merged.corporateActions.length).toEqual(1);
});

test("corporate actions two rows: extracts two actions with same actionID", () => {
	const segmented = service.extractFromXML(corporateActionsTwoRowsXml);
	expect(segmented.corporateActions.length).toEqual(2);
	const actionIds = new Set(segmented.corporateActions.map((ca) => ca.actionID));
	expect(actionIds.size).toEqual(1);
	expect(actionIds.has(IbkrActionId.Schema.parse("141913764"))).toEqual(true);
	const isins = new Set(segmented.corporateActions.map((ca) => ca.isin));
	expect(isins.has(IbkrIsin.Schema.parse("US86800U1043"))).toEqual(true);
	expect(isins.has(IbkrIsin.Schema.parse("US86800U3023"))).toEqual(true);
});

test("cash transactions dividends: returns 2 transactions", () => {
	const segmented = service.extractFromXML(dividendsXml);
	expect(segmented.cashTransactions.length).toEqual(2);
	expect(segmented.corporateActions.length).toEqual(0);
});

test("cash transactions dividends: merging deduplicates", () => {
	const s1 = service.extractFromXML(dividendsXml);
	const s2 = service.extractFromXML(dividendsXml);
	const merged = service.mergeTrades([s1, s2]);
	expect(merged.cashTransactions.length).toEqual(2);
});

test("cash transactions dividends: contains dividend and withholding tax", () => {
	const segmented = service.extractFromXML(dividendsXml);
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
	const segmented = service.extractFromXML(paymentInLieuXml);
	expect(segmented.cashTransactions.length).toEqual(2);
});

test("cash transactions payment in lieu: merging deduplicates", () => {
	const s1 = service.extractFromXML(paymentInLieuXml);
	const s2 = service.extractFromXML(paymentInLieuXml);
	const merged = service.mergeTrades([s1, s2]);
	expect(merged.cashTransactions.length).toEqual(2);
});

test("cash transactions payment in lieu: contains payment and withholding", () => {
	const segmented = service.extractFromXML(paymentInLieuXml);
	expect(segmented.cashTransactions[0].transactionID).toEqual("814208300");
	expect(segmented.cashTransactions[0].isin).toEqual("US5801351017");
	expect(segmented.cashTransactions[0].type).toEqual(
		IbkrCashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS,
	);

	expect(segmented.cashTransactions[1].transactionID).toEqual("814208301");
	expect(segmented.cashTransactions[1].type).toEqual(IbkrCashTransactionType.WITHHOLDING_TAX);
});
