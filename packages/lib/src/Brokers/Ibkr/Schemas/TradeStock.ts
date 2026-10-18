import { IbkrAssetClass } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrAssetClass";
import { IbkrBuyOrSell } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrBuyOrSell";
import { IbkrLevelOfDetail } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrLevelOfDetail";
import { IbkrOpenCloseIndicator } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrOpenCloseIndicator";
import { IbkrOrderType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrOrderType";
import { IbkrSecurityIDType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSecurityIDType";
import { IbkrSubCategory } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrSubCategory";
import { IbkrTransactionType } from "@brrr/Brokers/Ibkr/Schemas/Enums/IbkrTransactionType";
import {
	remap,
	zDateTime,
	zNotes,
	zNumNullable,
	zStrNullable,
} from "@brrr/Brokers/Ibkr/Schemas/FieldParsers";
import {
	IbkrCurrency,
	IbkrIsin,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import { z } from "zod/v4";

// Fields whose XML attribute name differs from the domain field name.
// All other fields share the same name in XML and the domain type.
const STOCK_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	assetCategory: "assetClass",
	notes: "notesAndCodes",
	cost: "costBasis",
	fifoPnlRealized: "fifoProfitAndLossRealized",
	capitalGainsPnl: "capitalGainsProfitAndLoss",
	fxPnl: "forexProfitAndLoss",
	mtmPnl: "marketToMarketProfitAndLoss",
	buySell: "buyOrSell",
};

export const TradeStock = {
	Schema: z.preprocess(
		(v) => remap(v, STOCK_ALIASES),
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
			listingExchange: z.string(),
			reportDate: zDateTime,
			dateTime: zDateTime,
			tradeDate: zDateTime,
			transactionType: z.enum(IbkrTransactionType),
			exchange: z.string(),
			quantity: z.coerce.number(),
			tradePrice: z.coerce.number(),
			tradeMoney: z.coerce.number(),
			proceeds: z.coerce.number(),
			taxes: z.coerce.number(),
			ibCommission: z.coerce.number(),
			ibCommissionCurrency: IbkrCurrency.Schema,
			netCash: z.coerce.number(),
			netCashInBase: zNumNullable,
			closePrice: z.coerce.number(),
			openCloseIndicator: z.enum(IbkrOpenCloseIndicator),
			notesAndCodes: zNotes,
			costBasis: z.coerce.number(),
			fifoProfitAndLossRealized: z.coerce.number(),
			capitalGainsProfitAndLoss: zNumNullable,
			forexProfitAndLoss: zNumNullable,
			marketToMarketProfitAndLoss: zNumNullable,
			buyOrSell: z.enum(IbkrBuyOrSell),
			transactionID: IbkrTransactionId.Schema,
			orderTime: zDateTime,
			levelOfDetail: z.enum(IbkrLevelOfDetail),
			changeInPrice: z.coerce.number(),
			changeInQuantity: z.coerce.number(),
			orderType: z.enum(IbkrOrderType),
			accruedInt: z.coerce.number(),
		}),
	),
};

export type TradeStock = z.output<typeof TradeStock.Schema>;
