import { assertEquals } from "@std/assert";
import { extractFromXML, mergeTrades } from "@brrr/brokerages/ibkr/transforms/Extract.ts";
import { BuyOrSell, CashTransactionType } from "@brrr/brokerages/ibkr/schemas/IbkrSchemas.ts";

const dir = new URL(".", import.meta.url).pathname;

function readXml(filename: string): string {
	return Deno.readTextFileSync(`${dir}${filename}`);
}

Deno.test("stock trades: returns trades and lot", () => {
	const segmented = extractFromXML(readXml("SimpleStockTrade.xml"));
	assertEquals(segmented.stockTrades.length, 2);
	assertEquals(segmented.stockLots.length, 1);
});

Deno.test("stock trades: contains buy and sell event", () => {
	const segmented = extractFromXML(readXml("SimpleStockTrade.xml"));
	const buyTrade = segmented.stockTrades[0];
	assertEquals(buyTrade.buyOrSell, BuyOrSell.BUY);
	assertEquals(buyTrade.isin, "FR0010242511");
	assertEquals(buyTrade.quantity, 5);
	assertEquals(buyTrade.transactionID, "241234985");

	const sellTrade = segmented.stockTrades[1];
	assertEquals(sellTrade.buyOrSell, BuyOrSell.SELL);
	assertEquals(sellTrade.isin, "FR0010242511");
	assertEquals(sellTrade.quantity, -5);
	assertEquals(sellTrade.transactionID, "262720557");
});

Deno.test("stock trades: buy event transaction relates to lot", () => {
	const segmented = extractFromXML(readXml("SimpleStockTrade.xml"));
	assertEquals(segmented.stockTrades[0].transactionID, "241234985");
	assertEquals(segmented.stockLots[0].transactionID, "241234985");
});

Deno.test("stock trades: merging deduplicates", () => {
	const s1 = extractFromXML(readXml("SimpleStockTrade.xml"));
	const s2 = extractFromXML(readXml("SimpleStockTrade.xml"));
	const merged = mergeTrades([s1, s2]);
	assertEquals(merged.stockTrades.length, 2);
});

Deno.test("option trades: returns trades and lot", () => {
	const segmented = extractFromXML(readXml("SimpleOptionTrade.xml"));
	assertEquals(segmented.derivativeTrades.length, 2);
	assertEquals(segmented.derivativeLots.length, 1);
});

Deno.test("option trades: contains buy and sell event", () => {
	const segmented = extractFromXML(readXml("SimpleOptionTrade.xml"));
	const buyTrade = segmented.derivativeTrades[0];
	assertEquals(buyTrade.buyOrSell, BuyOrSell.BUY);
	assertEquals(buyTrade.underlyingSecurityID, "US0378331005");
	assertEquals(buyTrade.quantity, 1);
	assertEquals(buyTrade.multiplier, 100);
	assertEquals(buyTrade.transactionID, "635331370");

	const sellTrade = segmented.derivativeTrades[1];
	assertEquals(sellTrade.buyOrSell, BuyOrSell.SELL);
	assertEquals(sellTrade.quantity, -1);
	assertEquals(sellTrade.transactionID, "639309966");
});

Deno.test("option trades: buy event relates to lot", () => {
	const segmented = extractFromXML(readXml("SimpleOptionTrade.xml"));
	assertEquals(segmented.derivativeTrades[0].transactionID, "635331370");
	assertEquals(segmented.derivativeLots[0].transactionID, "635331370");
});

Deno.test("option trades: merging deduplicates", () => {
	const s1 = extractFromXML(readXml("SimpleOptionTrade.xml"));
	const s2 = extractFromXML(readXml("SimpleOptionTrade.xml"));
	const merged = mergeTrades([s1, s2]);
	assertEquals(merged.derivativeTrades.length, 2);
});

Deno.test("corporate actions: returns one corporate action", () => {
	const segmented = extractFromXML(readXml("SimpleCorporateAction.xml"));
	assertEquals(segmented.derivativeTrades.length, 0);
	assertEquals(segmented.corporateActions.length, 1);
});

Deno.test("corporate actions: merging deduplicates", () => {
	const s1 = extractFromXML(readXml("SimpleCorporateAction.xml"));
	const s2 = extractFromXML(readXml("SimpleCorporateAction.xml"));
	const merged = mergeTrades([s1, s2]);
	assertEquals(merged.corporateActions.length, 1);
});

Deno.test("corporate actions two rows: extracts two actions with same actionID", () => {
	const segmented = extractFromXML(readXml("CorporateActionsTwoRows.xml"));
	assertEquals(segmented.corporateActions.length, 2);
	const actionIds = new Set(segmented.corporateActions.map((ca) => ca.actionID));
	assertEquals(actionIds.size, 1);
	assertEquals(actionIds.has("141913764"), true);
	const isins = new Set(segmented.corporateActions.map((ca) => ca.isin));
	assertEquals(isins.has("US86800U1043"), true);
	assertEquals(isins.has("US86800U3023"), true);
});

Deno.test("cash transactions dividends: returns 2 transactions", () => {
	const segmented = extractFromXML(readXml("SimpleCashTransactionOfDividends.xml"));
	assertEquals(segmented.cashTransactions.length, 2);
	assertEquals(segmented.corporateActions.length, 0);
});

Deno.test("cash transactions dividends: merging deduplicates", () => {
	const s1 = extractFromXML(readXml("SimpleCashTransactionOfDividends.xml"));
	const s2 = extractFromXML(readXml("SimpleCashTransactionOfDividends.xml"));
	const merged = mergeTrades([s1, s2]);
	assertEquals(merged.cashTransactions.length, 2);
});

Deno.test("cash transactions dividends: contains dividend and withholding tax", () => {
	const segmented = extractFromXML(readXml("SimpleCashTransactionOfDividends.xml"));
	const dividend = segmented.cashTransactions[0];
	assertEquals(dividend.transactionID, "269176073");
	assertEquals(dividend.isin, "FR0000120271");
	assertEquals(dividend.type, CashTransactionType.DIVIDEND);

	const withholding = segmented.cashTransactions[1];
	assertEquals(withholding.transactionID, "323614082");
	assertEquals(withholding.isin, "FR0000120271");
	assertEquals(withholding.type, CashTransactionType.WITHHOLDING_TAX);
});

Deno.test("cash transactions payment in lieu: returns 2 transactions", () => {
	const segmented = extractFromXML(readXml("SimpleCashTransactionOfPaymentInLieuOfDividends.xml"));
	assertEquals(segmented.cashTransactions.length, 2);
});

Deno.test("cash transactions payment in lieu: merging deduplicates", () => {
	const s1 = extractFromXML(readXml("SimpleCashTransactionOfPaymentInLieuOfDividends.xml"));
	const s2 = extractFromXML(readXml("SimpleCashTransactionOfPaymentInLieuOfDividends.xml"));
	const merged = mergeTrades([s1, s2]);
	assertEquals(merged.cashTransactions.length, 2);
});

Deno.test("cash transactions payment in lieu: contains payment and withholding", () => {
	const segmented = extractFromXML(readXml("SimpleCashTransactionOfPaymentInLieuOfDividends.xml"));
	assertEquals(segmented.cashTransactions[0].transactionID, "814208300");
	assertEquals(segmented.cashTransactions[0].isin, "US5801351017");
	assertEquals(segmented.cashTransactions[0].type, CashTransactionType.PAYMENT_IN_LIEU_OF_DIVIDENDS);

	assertEquals(segmented.cashTransactions[1].transactionID, "814208301");
	assertEquals(segmented.cashTransactions[1].type, CashTransactionType.WITHHOLDING_TAX);
});
