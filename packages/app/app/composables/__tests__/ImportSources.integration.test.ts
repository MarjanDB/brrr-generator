import {
	createContainer,
	DropReason,
	PredefinedInfoProvider,
	ReportPipeline,
	TradeEventCashTransactionDividend,
	TradeEventCashTransactionWithholdingTax,
	TradeEventDerivativeAcquired,
	TradeEventStockAcquired,
} from "@brrr/lib";
import { TestKit } from "@brrr/test-cases";
import { assert, describe, expect, test } from "vitest";
import {
	mountComposable,
	mountComposableUnder,
} from "~/composables/__tests__/support/mountComposable";
import { useImportLeftOut } from "~/composables/useImportLeftOut";
import { provideImportSources } from "~/composables/useImportSources";
import { RowSourceKind } from "~/types/importSources";
import { keyAttributesOf } from "~/utils/rowAttributes";

const pipeline = createContainer(new PredefinedInfoProvider()).get(ReportPipeline);

describe("the broker rows behind the test cases' real imports", () => {
	test("a trade in two downloads shows both files, and is counted once", async () => {
		const imported = pipeline.read(TestKit.ibkr.overlappingExports.readInputs());
		const sources = await mountComposable(() => provideImportSources(() => imported.provenance));
		const buy = imported.events.groupings[0]?.stockTrades[0];
		assert(buy instanceof TradeEventStockAcquired);

		const found = sources.of(buy);
		const keys = keyAttributesOf(found.row.row, RowSourceKind.TRADE);
		const leftOut = await mountComposableUnder(
			() => provideImportSources(() => imported.provenance),
			() => useImportLeftOut(() => imported.provenance),
		);

		expect(found.row.fileName).toEqual("SecondDownload.xml");
		expect(found.alsoIn).toHaveLength(1);
		expect(found.alsoIn[0]?.fileName).toEqual("FirstDownload.xml");
		expect(keys).toHaveLength(7);
		expect(keys[0]).toEqual({ name: "tradeDate", value: "2022-02-22" });
		expect(keys[1]).toEqual({ name: "buySell", value: "BUY" });
		expect(keys[2]).toEqual({ name: "quantity", value: "5" });
		expect(keys[3]).toEqual({ name: "tradePrice", value: "8.02" });
		expect(keys[4]).toEqual({ name: "currency", value: "EUR" });
		expect(keys[5]).toEqual({ name: "ibCommission", value: "-3" });
		expect(keys[6]).toEqual({ name: "transactionID", value: "241234985" });
		expect(leftOut.value.merged).toHaveLength(2);
		expect(leftOut.value.lines).toHaveLength(0);
		expect(leftOut.value.needsALook).toEqual(0);
	});

	test("a dividend and its withholding tax show their cash rows", async () => {
		const imported = pipeline.read(TestKit.ibkr.dividends.readInputs());
		const sources = await mountComposable(() => provideImportSources(() => imported.provenance));
		const dividend = imported.events.groupings[0]?.cashTransactions[0];
		const withholding = imported.events.groupings[0]?.cashTransactions[1];
		assert(dividend instanceof TradeEventCashTransactionDividend);
		assert(withholding instanceof TradeEventCashTransactionWithholdingTax);

		const dividendFound = sources.of(dividend);
		const dividendKeys = keyAttributesOf(dividendFound.row.row, RowSourceKind.CASH_TRANSACTION);
		const withholdingKeys = keyAttributesOf(
			sources.of(withholding).row.row,
			RowSourceKind.CASH_TRANSACTION,
		);

		expect(dividendFound.row.fileName).toEqual("SimpleCashTransactionOfDividends.xml");
		expect(dividendFound.alsoIn).toHaveLength(0);
		expect(dividendKeys).toHaveLength(7);
		expect(dividendKeys[0]).toEqual({ name: "dateTime", value: "2022-04-01;20:20:00 EDT" });
		expect(dividendKeys[1]).toEqual({ name: "type", value: "Dividends" });
		expect(dividendKeys[2]).toEqual({ name: "amount", value: "2.64" });
		expect(dividendKeys[3]).toEqual({ name: "currency", value: "EUR" });
		expect(dividendKeys[4]).toEqual({
			name: "description",
			value: "TTE(FR0000120271) CASH DIVIDEND EUR 0.66 PER SHARE (Ordinary Dividend)",
		});
		expect(dividendKeys[5]).toEqual({ name: "actionID", value: "102869793" });
		expect(dividendKeys[6]).toEqual({ name: "transactionID", value: "269176073" });
		expect(withholdingKeys[1]).toEqual({ name: "type", value: "Withholding Tax" });
		expect(withholdingKeys[2]).toEqual({ name: "amount", value: "-0.66" });
		expect(withholdingKeys[6]).toEqual({ name: "transactionID", value: "323614082" });
	});

	test("an option trade shows its trade row", async () => {
		const imported = pipeline.read(TestKit.ibkr.optionTrade.readInputs());
		const sources = await mountComposable(() => provideImportSources(() => imported.provenance));
		expect(imported.events.groupings).toHaveLength(1);
		const trade = imported.events.groupings[0]?.derivativeGroupings[0]?.derivativeTrades[0];
		assert(trade instanceof TradeEventDerivativeAcquired);

		const found = sources.of(trade);
		const keys = keyAttributesOf(found.row.row, RowSourceKind.TRADE);

		expect(found.row.fileName).toEqual("SimpleOptionTrade.xml");
		expect(keys).toHaveLength(7);
		expect(keys[0]).toEqual({ name: "tradeDate", value: "2023-12-14" });
		expect(keys[1]).toEqual({ name: "buySell", value: "BUY" });
		expect(keys[2]).toEqual({ name: "quantity", value: "1" });
		expect(keys[3]).toEqual({ name: "tradePrice", value: "0.46" });
		expect(keys[4]).toEqual({ name: "currency", value: "USD" });
		expect(keys[5]).toEqual({ name: "ibCommission", value: "-0.73925" });
		expect(keys[6]).toEqual({ name: "transactionID", value: "635331370" });
	});

	test("a corporate action missing its other half is left out, with the row it was read from", async () => {
		const imported = pipeline.read([
			TestKit.ibkr.corporateAction.inputs.simpleCorporateAction.read(),
		]);

		const leftOut = await mountComposableUnder(
			() => provideImportSources(() => imported.provenance),
			() => useImportLeftOut(() => imported.provenance),
		);

		expect(leftOut.value.lines).toHaveLength(1);
		expect(leftOut.value.lines[0]?.drop.reason).toEqual(DropReason.UNPAIRED);
		expect(leftOut.value.lines[0]?.rows).toHaveLength(1);
		expect(leftOut.value.lines[0]?.rows[0]?.fileName).toEqual("SimpleCorporateAction.xml");
		expect(leftOut.value.lines[0]?.rows[0]?.row.fields.transactionID).toEqual("459779393");
		expect(leftOut.value.lines[0]?.files).toHaveLength(0);
		expect(leftOut.value.needsALook).toEqual(1);
		expect(leftOut.value.merged).toHaveLength(0);
	});
});
