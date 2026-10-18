import {
	IbkrActionId,
	IbkrCurrency,
	IbkrIsin,
	IbkrListingExchange,
	IbkrSecurityId,
	IbkrSymbol,
	IbkrTransactionId,
} from "@brrr/Brokers/Ibkr/Schemas/IbkrIdentifiers";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime } from "luxon";
import { z } from "zod/v4";

export enum IbkrAssetClass {
	STOCK = "STK",
	CASH = "CASH",
	OPTION = "OPT",
}

export enum IbkrSubCategory {
	NONE = "",
	COMMON = "COMMON",
	PREFERRED = "PREFERRED",
	RIGHT = "RIGHT",
	ADR = "ADR",
	ROYALTY_RUST = "ROYALTY TRST",
	ETF = "ETF",
	C = "C",
	P = "P",
}

export enum IbkrOpenCloseIndicator {
	OPEN = "O",
	CLOSE = "C",
	NOT_SPECIFIED = "",
}

export enum IbkrTransactionType {
	EXCHANGE_TRADE = "ExchTrade",
}

export enum IbkrSecurityIDType {
	ISIN = "ISIN",
}

export enum IbkrBuyOrSell {
	BUY = "BUY",
	SELL = "SELL",
}

export enum IbkrPutOrCall {
	PUT = "P",
	CALL = "C",
}

export enum IbkrCodes {
	ASSIGNMENT = "A",
	ADR_FEE_ACCRUAL = "ADR",
	AUTOMATIC_EXERCISE_FOR_DIVIDEND_RELATED_RECOMMENDATION = "AEx",
	AUTOFX_CONVERSION__RESULTING_FROM_TRADING = "AFx",
	ADJUSTMENT = "Adj",
	ALLOCATION = "Al",
	AWAY_TRADE = "Aw",
	AUTOMATIC_BUY_IN = "B",
	DIRECT_BORROW = "Bo",
	CLOSING_TRADE = "C",
	CASH_DELIVERY = "CD",
	COMPLEX_POSITION = "CP",
	CANCELLED = "Ca",
	CORRECTED_TRADE = "Co",
	PART_OR_ALL_OF_TRANSACTION_WAS_CROSSING = "Cx",
	ETF_CREATION_REDEMPTION = "ETF",
	RESULTED_FROM_AN_EXPIRED_POSITION = "Ep",
	EXERCISE = "Ex",
	FP = "FP",
	FPA = "FPA",
	TRADE_IN_GUARANTEED_ACCOUNT_SEGMENT = "G",
	EXERCISE_OR_ASSIGNMENT_FROM_OFFSETTING = "GEA",
	HIGHEST_COST_TAX_BASIS_ELECTION = "HC",
	INVESTMENT_TRANSFERRED_TO_HEDGE_FUND = "HFI",
	INTERNAL_TRANSFER = "I",
	TRANSACTION_EXECUTED_AGAINST_IB = "IA",
	IM = "IM",
	INVESTMENT_TRANSFER_FROM_INVESTOR = "INV",
	IPO = "IPO",
	ORDER_BY_IB_MARGIN_VIOLATION = "L",
	ADJUSTED_BY_LOSS_DISALLOWED_FROM_WASH_SALE = "LD",
	LIFO_TAX_BASIS_ELECTION = "LI",
	LONG_TERM_PL = "LT",
	DIRECT_LOAN = "Lo",
	ENTERED_MANUALLY_BY_IB = "M",
	MANUAL_EXERCISE = "MEx",
	MAXIMIZE_LOSSES = "ML",
	MAXIMIZE_LONG_TERM_GAIN = "MLG",
	MAXIMIZE_LONG_TERM_LOSS = "MLL",
	MAXIMIZE_SHORT_TERM_GAIN = "MSG",
	MAXIMIZE_SHORT_TERM_LOSS = "MSL",
	OPENING_TRADE = "O",
	PARTIAL_EXECUTION = "P",
	PERPETUAL_INVESTMENT = "PE",
	PRICE_IMPROVEMENT = "PI",
	INTEREST_OR_DIVIDEND_ACCRUAL_POSTING = "Po",
	Pr = "Pr",
	DIVIDEND_REINVESTMENT = "R",
	REDEMPTION = "RED",
	RECURRING_INVESTMENT = "RI",
	RP = "RP",
	RPA = "RPA",
	REBILL = "Rb",
	INTEREST_OR_DIVIDEND_ACCRUAL_REVERSAL = "Re",
	REIMBURSEMENT = "Ri",
	SF = "SF",
	SOLICITED = "SI",
	SPECIFIC_LOT_TAX_BASIS_ELECTION = "SL",
	SO = "SO",
	SS = "SS",
	SHORT_TERM_PL = "ST",
	TRANSFER = "T",
	UNVESTED_SHARED_FROM_STOCK_GRANT = "Un",
	MUTUAL_FUND_EXCHANGE_TRANSACTION = "XCH",
}

export enum IbkrLevelOfDetail {
	EXECUTION = "EXECUTION",
	DETAIL = "DETAIL",
	CLOSED_LOT = "CLOSED_LOT",
}

export enum IbkrOrderType {
	LIMIT = "LMT",
	MARKET = "MKT",
	MID_POINT = "MIDPX",
	STOP = "STP",
	STOP_LIMIT = "STPLMT",
}

export enum IbkrModel {
	INDEPENDENT = "Independent",
}

export enum IbkrCashTransactionType {
	WITHHOLDING_TAX = "Withholding Tax",
	DIVIDEND = "Dividends",
	PAYMENT_IN_LIEU_OF_DIVIDENDS = "Payment In Lieu Of Dividends",
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const zStrNullable = z.string().transform((s) => (s === "" ? null : s));
const zNumNullable = z.string().transform((s) => (s === "" ? null : parseFloat(s)));

const DATE_FORMATS = [
	"yyyy-MM-dd HH:mm:ss ZZ",
	"yyyy-MM-dd;HH:mm:ss ZZ",
	"yyyy-MM-dd",
	"yyyyMMdd;HHmmss",
	"yyyyMMdd",
];

function parseDateString(s: string, ctx: z.RefinementCtx): ValidDateTime {
	const normalized = s.replace("EDT", "-04:00").replace("EST", "-05:00");
	for (const fmt of DATE_FORMATS) {
		const parsed = DateTime.fromFormat(normalized, fmt);
		if (parsed.isValid) return parsed;
	}
	const iso = DateTime.fromISO(normalized);
	if (iso.isValid) return iso;
	ctx.addIssue({ code: "custom", message: `Could not parse date: ${s}` });
	return z.NEVER;
}

const zDateTime = z.string().transform(parseDateString);
const zDateTimeNullable = z.string().transform((s, ctx): ValidDateTime | null => {
	if (s === "") return null;
	return parseDateString(s, ctx);
});

const zNotes = z.string().transform((s): IbkrCodes[] => {
	if (s === "") return [];
	return s.split(";").map((code) => code as IbkrCodes);
});

// ---------------------------------------------------------------------------
// Schemas
// Raw XML attribute names are used as keys. Where the XML name differs from
// the domain name, the field is aliased via z.preprocess on the raw input.
// ---------------------------------------------------------------------------

function remap(raw: unknown, aliases: Record<string, string>): unknown {
	if (typeof raw !== "object" || raw === null) return raw;

	const result: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
	for (const [xmlKey, domainKey] of Object.entries(aliases)) {
		if (xmlKey in result) {
			result[domainKey] = result[xmlKey];
			delete result[xmlKey];
		}
	}
	return result;
}

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

const LOT_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	assetCategory: "assetClass",
	notes: "notesAndCodes",
	cost: "costBasis",
	fifoPnlRealized: "fifoProfitAndLossRealized",
	capitalGainsPnl: "capitalGainsProfitAndLoss",
	fxPnl: "forexProfitAndLoss",
	buySell: "buyOrSell",
};

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

const CASH_ALIASES: Record<string, string> = {
	accountId: "clientAccountID",
	assetCategory: "assetClass",
};

// ---------------------------------------------------------------------------
// TradeStock
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// LotStock
// ---------------------------------------------------------------------------

export const LotStock = {
	Schema: z.preprocess(
		(v) => remap(v, LOT_ALIASES),
		z.object({
			clientAccountID: z.string(),
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
			multiplier: z.coerce.number(),
			reportDate: zDateTime,
			dateTime: zDateTime,
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

export type LotStock = z.output<typeof LotStock.Schema>;

// ---------------------------------------------------------------------------
// TradeDerivative
// ---------------------------------------------------------------------------

export const TradeDerivative = {
	Schema: z.preprocess(
		(v) => remap(v, DERIVATIVE_ALIASES),
		z.object({
			clientAccountID: z.string(),
			currency: IbkrCurrency.Schema,
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
			tradeID: z.string(),
			multiplier: z.coerce.number(),
			strike: z.coerce.number(),
			reportDate: zDateTime,
			expiry: zDateTime,
			dateTime: zDateTime,
			putOrCall: z.enum(IbkrPutOrCall),
			tradeDate: zDateTime,
			settleDateTarget: zDateTime,
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
			netCashInBase: z.coerce.number(),
			closePrice: z.coerce.number(),
			openCloseIndicator: z.enum(IbkrOpenCloseIndicator),
			notesAndCodes: zNotes,
			costBasis: z.coerce.number(),
			fifoProfitAndLossRealized: z.coerce.number(),
			capitalGainsProfitAndLoss: z.coerce.number(),
			forexProfitAndLoss: z.coerce.number(),
			marketToMarketProfitAndLoss: zNumNullable,
			buyOrSell: z.enum(IbkrBuyOrSell),
			transactionID: IbkrTransactionId.Schema,
			orderTime: zDateTime,
			levelOfDetail: z.enum(IbkrLevelOfDetail),
			orderType: z.enum(IbkrOrderType),
		}),
	),
};

export type TradeDerivative = z.output<typeof TradeDerivative.Schema>;

// ---------------------------------------------------------------------------
// LotDerivative
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CorporateAction
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// TransactionCash
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FlexQueryResponse — top-level XML document schema
// ---------------------------------------------------------------------------

function toArray<T extends z.ZodTypeAny>(schema: T) {
	return z.preprocess(
		(v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]),
		z.array(schema),
	);
}

const RawRecord = z.record(z.string(), z.unknown());

function emptyIfNotObject(v: unknown): unknown {
	return typeof v === "object" && v !== null ? v : {};
}

const FlexStatementSchema = z.object({
	Trades: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				Trade: toArray(RawRecord),
				Lot: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { Trade: [], Lot: [] }),
	CashTransactions: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				CashTransaction: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { CashTransaction: [] }),
	CorporateActions: z
		.preprocess(
			emptyIfNotObject,
			z.object({
				CorporateAction: toArray(RawRecord),
			}),
		)
		.optional()
		.transform((v) => v ?? { CorporateAction: [] }),
});

export type FlexStatement = z.output<typeof FlexStatementSchema>;

export const FlexQueryResponseSchema = z.object({
	FlexQueryResponse: z.object({
		FlexStatements: z.object({
			FlexStatement: toArray(FlexStatementSchema),
		}),
	}),
});
