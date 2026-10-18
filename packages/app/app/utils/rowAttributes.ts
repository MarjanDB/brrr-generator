import type { ProvenanceNode } from "@brrr/lib";
import { RowSourceKind } from "~/types/importSources";

// IBKR Flex Query attribute names, as the export spells them.
export enum IbkrRowAttribute {
	TRADE_DATE = "tradeDate",
	BUY_SELL = "buySell",
	QUANTITY = "quantity",
	TRADE_PRICE = "tradePrice",
	CURRENCY = "currency",
	IB_COMMISSION = "ibCommission",
	TRANSACTION_ID = "transactionID",
	DATE_TIME = "dateTime",
	TYPE = "type",
	AMOUNT = "amount",
	DESCRIPTION = "description",
	ACTION_ID = "actionID",
}

export type RowAttribute = { name: string; value: string };

// The attributes a row's popover lists first, in this order.
export const keyAttributes: Record<RowSourceKind, IbkrRowAttribute[]> = {
	[RowSourceKind.TRADE]: [
		IbkrRowAttribute.TRADE_DATE,
		IbkrRowAttribute.BUY_SELL,
		IbkrRowAttribute.QUANTITY,
		IbkrRowAttribute.TRADE_PRICE,
		IbkrRowAttribute.CURRENCY,
		IbkrRowAttribute.IB_COMMISSION,
		IbkrRowAttribute.TRANSACTION_ID,
	],
	[RowSourceKind.CASH_TRANSACTION]: [
		IbkrRowAttribute.DATE_TIME,
		IbkrRowAttribute.TYPE,
		IbkrRowAttribute.AMOUNT,
		IbkrRowAttribute.CURRENCY,
		IbkrRowAttribute.DESCRIPTION,
		IbkrRowAttribute.ACTION_ID,
		IbkrRowAttribute.TRANSACTION_ID,
	],
};

// The key attributes the row has, in the kind's order. One the row lacks is skipped; an empty one
// is kept.
export function keyAttributesOf(row: ProvenanceNode, kind: RowSourceKind): RowAttribute[] {
	const attributes: RowAttribute[] = [];
	for (const name of keyAttributes[kind]) {
		const value = row.fields[name];
		if (value !== undefined) {
			attributes.push({ name, value });
		}
	}
	return attributes;
}

// Every attribute of the row, by name in code-unit order.
export function allAttributesOf(row: ProvenanceNode): RowAttribute[] {
	return Object.entries(row.fields)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([name, value]) => ({ name, value }));
}
