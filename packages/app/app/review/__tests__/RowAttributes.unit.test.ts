import { ProvenanceGraph, ProvenanceNodeKind } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { IbkrRowAttribute } from "~/review/IbkrRowAttribute";
import { RowSourceKind } from "~/review/RowSourceKind";
import { allAttributesOf, keyAttributes, keyAttributesOf } from "~/review/rowAttributes";

describe("a broker row's attributes", () => {
	test("a trade's key attributes come in the listed order, skipping one the row lacks and keeping an empty one", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const row = {};
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 7 · ACME", {
			accountId: "FakeAccountId",
			currency: "USD",
			tradePrice: "5",
			quantity: "10",
			buySell: "BUY",
			tradeDate: "2024-01-10",
			ibCommission: "",
		});

		const keys = keyAttributesOf(graph.nodeOf(row), RowSourceKind.TRADE);

		expect(keys).toHaveLength(6);
		expect(keys[0]).toEqual({ name: "tradeDate", value: "2024-01-10" });
		expect(keys[1]).toEqual({ name: "buySell", value: "BUY" });
		expect(keys[2]).toEqual({ name: "quantity", value: "10" });
		expect(keys[3]).toEqual({ name: "tradePrice", value: "5" });
		expect(keys[4]).toEqual({ name: "currency", value: "USD" });
		expect(keys[5]).toEqual({ name: "ibCommission", value: "" });
	});

	test("a cash transaction's key attributes are the listed ones", () => {
		expect(keyAttributes[RowSourceKind.CASH_TRANSACTION]).toEqual([
			IbkrRowAttribute.DATE_TIME,
			IbkrRowAttribute.TYPE,
			IbkrRowAttribute.AMOUNT,
			IbkrRowAttribute.CURRENCY,
			IbkrRowAttribute.DESCRIPTION,
			IbkrRowAttribute.ACTION_ID,
			IbkrRowAttribute.TRANSACTION_ID,
		]);
	});

	test("all attributes are every field, by name", () => {
		const graph = new ProvenanceGraph({ parent: null });
		const row = {};
		graph.node(row, ProvenanceNodeKind.ROW, "Trade 7 · ACME", {
			accountId: "FakeAccountId",
			currency: "USD",
			tradePrice: "5",
			quantity: "10",
			buySell: "BUY",
			tradeDate: "2024-01-10",
			ibCommission: "",
		});

		const all = allAttributesOf(graph.nodeOf(row));

		expect(all).toHaveLength(7);
		expect(all[0]?.name).toEqual("accountId");
		expect(all[1]?.name).toEqual("buySell");
		expect(all[2]?.name).toEqual("currency");
		expect(all[3]?.name).toEqual("ibCommission");
		expect(all[4]?.name).toEqual("quantity");
		expect(all[5]?.name).toEqual("tradeDate");
		expect(all[6]?.name).toEqual("tradePrice");
	});
});
