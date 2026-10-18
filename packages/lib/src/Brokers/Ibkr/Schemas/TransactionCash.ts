import { IbkrAssetClass } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrAssetClass";
import { IbkrCashTransactionType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrCashTransactionType";
import { IbkrSecurityIDType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSecurityIDType";
import { IbkrSubCategory } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSubCategory";
import { remap, zDateTime, zStrNullable } from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import {
	IbkrActionId,
	IbkrCurrency,
	IbkrIsin,
	IbkrListingExchange,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { z } from "zod/v4";

const CASH_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	assetCategory: "assetClass",
};

export const TransactionCash = {
	Schema: z.preprocess(
		(v) => remap(v, CASH_ALIASES),
		z.object({
			clientAccountID: z.string(),
			currency: IbkrCurrency.Schema,
			fxRateToBase: z.coerce.number(),
			assetClass: z.enum(IbkrAssetClass),
			subCategory: z.enum(IbkrSubCategory),
			symbol: IbkrSymbol.Schema,
			description: z.string(),
			conid: z.string(),
			securityID: z.string(),
			securityIDType: z.enum(IbkrSecurityIDType),
			cusip: zStrNullable,
			isin: IbkrIsin.Schema,
			figi: zStrNullable,
			listingExchange: IbkrListingExchange.Schema,
			dateTime: zDateTime,
			settleDate: zDateTime,
			amount: z.coerce.number(),
			type: z.enum(IbkrCashTransactionType),
			code: zStrNullable,
			transactionID: IbkrTransactionId.Schema,
			reportDate: zDateTime,
			actionID: IbkrActionId.Schema,
		}),
	),
};

export type TransactionCash = z.output<typeof TransactionCash.Schema>;
