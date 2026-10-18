import { IbkrAssetClass } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrAssetClass";
import { IbkrBuyOrSell } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrBuyOrSell";
import { IbkrLevelOfDetail } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrLevelOfDetail";
import { IbkrOpenCloseIndicator } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrOpenCloseIndicator";
import { IbkrPutOrCall } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrPutOrCall";
import { IbkrSubCategory } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSubCategory";
import { remap, zDateTime, zNotes, zStrNullable } from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import {
	IbkrSecurityId,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { z } from "zod/v4";

const DERIVATIVE_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	assetCategory: "assetClass",
	notes: "notesAndCodes",
	cost: "costBasis",
	fifoPnlRealized: "fifoProfitAndLossRealized",
	capitalGainsPnl: "capitalGainsProfitAndLoss",
	fxPnl: "forexProfitAndLoss",
	mtmPnl: "marketToMarketProfitAndLoss",
	buySell: "buyOrSell",
	putCall: "putOrCall",
};

export const LotDerivative = {
	Schema: z.preprocess(
		(v) => remap(v, DERIVATIVE_ALIASES),
		z.object({
			clientAccountID: z.string(),
			currency: z.string(),
			fxRateToBase: z.coerce.number(),
			assetClass: z.enum(IbkrAssetClass),
			subCategory: z.enum(IbkrSubCategory),
			symbol: IbkrSymbol.Schema,
			description: z.string(),
			conid: z.string(),
			figi: zStrNullable,
			listingExchange: z.string(),
			underlyingConid: z.string(),
			underlyingSymbol: z.string(),
			underlyingSecurityID: IbkrSecurityId.Schema,
			underlyingListingExchange: z.string(),
			multiplier: z.coerce.number(),
			strike: z.coerce.number(),
			reportDate: zDateTime,
			expiry: zDateTime,
			dateTime: zDateTime,
			putOrCall: z.enum(IbkrPutOrCall),
			tradeDate: zDateTime,
			exchange: z.string(),
			quantity: z.coerce.number(),
			tradePrice: z.coerce.number(),
			openCloseIndicator: z.enum(IbkrOpenCloseIndicator),
			notesAndCodes: zNotes,
			costBasis: z.coerce.number(),
			fifoProfitAndLossRealized: z.coerce.number(),
			capitalGainsProfitAndLoss: z.coerce.number(),
			forexProfitAndLoss: z.coerce.number(),
			buyOrSell: z.enum(IbkrBuyOrSell),
			transactionID: IbkrTransactionId.Schema,
			openDateTime: zDateTime,
			holdingPeriodDateTime: zDateTime,
			levelOfDetail: z.enum(IbkrLevelOfDetail),
		}),
	),
};

export type LotDerivative = z.output<typeof LotDerivative.Schema>;
