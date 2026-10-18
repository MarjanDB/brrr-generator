import { IbkrAssetClass } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrAssetClass";
import { IbkrLevelOfDetail } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrLevelOfDetail";
import type { IbkrModel } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrModel";
import type { IbkrPutOrCall } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrPutOrCall";
import { IbkrSecurityIDType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSecurityIDType";
import { IbkrSubCategory } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSubCategory";
import {
	remap,
	zDateTime,
	zDateTimeNullable,
	zNotes,
	zNumNullable,
	zStrNullable,
} from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import {
	IbkrActionId,
	IbkrIsin,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { z } from "zod/v4";

const CORPORATE_ACTION_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	acctAlias: "accountAlias",
	assetCategory: "assetClass",
	code: "notesAndCodes",
	fifoPnlRealized: "fifoProfitAndLossRealized",
	capitalGainsPnl: "capitalGainsProfitAndLoss",
	fxPnl: "forexProfitAndLoss",
	mtmPnl: "marketToMarketProfitAndLoss",
	putCall: "putOrCall",
};

export const CorporateAction = {
	Schema: z.preprocess(
		(v) => remap(v, CORPORATE_ACTION_ALIASES),
		z.object({
			clientAccountID: z.string(),
			accountAlias: zStrNullable,
			model: z.string().transform((s) => (s === "" ? null : (s as IbkrModel))),
			currency: z.string(),
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
			listingExchange: z.string(),
			underlyingConid: zStrNullable,
			underlyingSymbol: zStrNullable,
			underlyingSecurityID: zStrNullable,
			underlyingListingExchange: zStrNullable,
			multiplier: z.coerce.number(),
			strike: zNumNullable,
			expiry: zDateTimeNullable,
			putOrCall: z.string().transform((s) => (s === "" ? null : (s as IbkrPutOrCall))),
			principalAdjustFactor: zNumNullable,
			reportDate: zDateTime,
			dateTime: zDateTime,
			actionDescription: z.string(),
			amount: z.coerce.number(),
			proceeds: z.coerce.number(),
			value: z.coerce.number(),
			quantity: z.coerce.number(),
			fifoProfitAndLossRealized: z.coerce.number(),
			capitalGainsProfitAndLoss: zNumNullable.optional().transform((s) => s ?? null),
			forexProfitAndLoss: zNumNullable.optional().transform((s) => s ?? null),
			marketToMarketProfitAndLoss: zNumNullable,
			notesAndCodes: zNotes,
			type: z.string(),
			transactionID: IbkrTransactionId.Schema,
			actionID: IbkrActionId.Schema,
			levelOfDetail: z.enum(IbkrLevelOfDetail),
			serialNumber: zStrNullable,
			deliveryType: zStrNullable,
			commodityType: zStrNullable,
			fineness: zNumNullable.optional().transform((s) => s ?? null),
			weight: zNumNullable.optional().transform((s) => s ?? null),
		}),
	),
};

export type CorporateAction = z.output<typeof CorporateAction.Schema>;
