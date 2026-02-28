import type {
	CorporateAction,
	LotDerivative,
	LotStock,
	TradeDerivative,
	TradeStock,
	TransactionCash,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import {
	AssetClass,
	type BuyOrSell,
	type CashTransactionType,
	type Codes,
	type LevelOfDetail,
	type Model,
	type OpenCloseIndicator,
	type OrderType,
	type PutOrCall,
	type SecurityIDType,
	type SubCategory,
	type TransactionType,
} from "@brrr/Brokerages/Ibkr/Schemas/IbkrSchemas.ts";
import type { SegmentedTrades } from "@brrr/Brokerages/Ibkr/Schemas/SegmentedTrades.ts";
import { floatValueOrNull, safeDateParse, valueOrNull } from "@brrr/Brokerages/Utils/ValueParsingUtils.ts";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function toArray<T>(val: T | T[] | undefined | null): T[] {
	if (val === undefined || val === null) return [];
	return Array.isArray(val) ? val : [val];
}

function parseNotes(notes: string): Codes[] {
	if (notes === "") return [];
	return notes.split(";").map((code) => code as Codes);
}

function extractCorporateAction(att: Record<string, string>): CorporateAction {
	return {
		clientAccountID: att["accountId"],
		accountAlias: valueOrNull(att["acctAlias"] ?? ""),
		currency: att["currency"],
		model: att["model"] && att["model"] !== "" ? att["model"] as Model : null,
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		securityID: att["securityID"],
		securityIDType: att["securityIDType"] as SecurityIDType,
		cusip: valueOrNull(att["cusip"] ?? ""),
		isin: att["isin"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		underlyingConid: valueOrNull(att["underlyingConid"] ?? ""),
		underlyingSymbol: valueOrNull(att["underlyingSymbol"] ?? ""),
		underlyingSecurityID: valueOrNull(att["underlyingSecurityID"] ?? ""),
		underlyingListingExchange: valueOrNull(att["underlyingListingExchange"] ?? ""),
		multiplier: parseFloat(att["multiplier"]),
		strike: floatValueOrNull(att["strike"] ?? ""),
		expiry: att["expiry"] && att["expiry"] !== "" ? safeDateParse(att["expiry"]) : null,
		putOrCall: valueOrNull(att["putCall"] ?? "") !== null ? att["putCall"] as PutOrCall : null,
		principalAdjustFactor: floatValueOrNull(att["principalAdjustFactor"] ?? ""),
		reportDate: safeDateParse(att["reportDate"]),
		dateTime: safeDateParse(att["dateTime"]),
		actionDescription: att["actionDescription"],
		amount: parseFloat(att["amount"]),
		proceeds: parseFloat(att["proceeds"]),
		value: parseFloat(att["value"]),
		quantity: parseFloat(att["quantity"]),
		fifoProfitAndLossRealized: parseFloat(att["fifoPnlRealized"]),
		capitalGainsProfitAndLoss: parseFloat(att["capitalGainsPnl"] ?? "0"),
		forexProfitAndLoss: parseFloat(att["fxPnl"] ?? "0"),
		marketToMarketProfitAndLoss: floatValueOrNull(att["mtmPnl"] ?? ""),
		notesAndCodes: parseNotes(att["code"] ?? ""),
		type: att["type"],
		transactionID: att["transactionID"],
		actionID: att["actionID"],
		levelOfDetail: att["levelOfDetail"] as LevelOfDetail,
		serialNumber: valueOrNull(att["serialNumber"] ?? ""),
		deliveryType: valueOrNull(att["deliveryType"] ?? ""),
		commodityType: valueOrNull(att["commodityType"] ?? ""),
		fineness: parseFloat(att["fineness"] ?? "0.0"),
		weight: parseFloat(att["weight"] ?? "0.0"),
	};
}

function extractStockTrade(att: Record<string, string>): TradeStock {
	return {
		clientAccountID: att["accountId"],
		currency: att["currency"],
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		securityID: att["securityID"],
		securityIDType: att["securityIDType"] as SecurityIDType,
		cusip: valueOrNull(att["cusip"] ?? ""),
		isin: att["isin"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		reportDate: safeDateParse(att["reportDate"]),
		dateTime: safeDateParse(att["dateTime"]),
		tradeDate: safeDateParse(att["tradeDate"]),
		transactionType: att["transactionType"] as TransactionType,
		exchange: att["exchange"],
		quantity: parseFloat(att["quantity"]),
		tradePrice: parseFloat(att["tradePrice"]),
		tradeMoney: parseFloat(att["tradeMoney"]),
		proceeds: parseFloat(att["proceeds"]),
		taxes: parseFloat(att["taxes"]),
		ibCommission: parseFloat(att["ibCommission"]),
		ibCommissionCurrency: att["ibCommissionCurrency"],
		netCash: parseFloat(att["netCash"]),
		netCashInBase: floatValueOrNull(att["netCashInBase"] ?? ""),
		closePrice: parseFloat(att["closePrice"]),
		openCloseIndicator: att["openCloseIndicator"] as OpenCloseIndicator,
		notesAndCodes: parseNotes(att["notes"] ?? ""),
		costBasis: parseFloat(att["cost"]),
		fifoProfitAndLossRealized: parseFloat(att["fifoPnlRealized"]),
		capitalGainsProfitAndLoss: floatValueOrNull(att["capitalGainsPnl"] ?? ""),
		forexProfitAndLoss: floatValueOrNull(att["fxPnl"] ?? ""),
		marketToMarketProfitAndLoss: floatValueOrNull(att["mtmPnl"] ?? ""),
		buyOrSell: att["buySell"] as BuyOrSell,
		transactionID: att["transactionID"],
		orderTime: safeDateParse(att["orderTime"]),
		levelOfDetail: att["levelOfDetail"] as LevelOfDetail,
		changeInPrice: parseFloat(att["changeInPrice"]),
		changeInQuantity: parseFloat(att["changeInQuantity"]),
		orderType: att["orderType"] as OrderType,
		accruedInterest: parseFloat(att["accruedInt"]),
	};
}

function extractStockLot(att: Record<string, string>): LotStock {
	return {
		clientAccountID: att["accountId"],
		currency: att["currency"],
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		securityID: att["securityID"],
		securityIDType: att["securityIDType"] as SecurityIDType,
		cusip: valueOrNull(att["cusip"] ?? ""),
		isin: att["isin"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		multiplier: parseFloat(att["multiplier"]),
		reportDate: safeDateParse(att["reportDate"]),
		dateTime: safeDateParse(att["dateTime"]),
		tradeDate: safeDateParse(att["tradeDate"]),
		exchange: att["exchange"],
		quantity: parseFloat(att["quantity"]),
		tradePrice: parseFloat(att["tradePrice"]),
		openCloseIndicator: att["openCloseIndicator"] as OpenCloseIndicator,
		notesAndCodes: parseNotes(att["notes"] ?? ""),
		costBasis: parseFloat(att["cost"]),
		fifoProfitAndLossRealized: parseFloat(att["fifoPnlRealized"]),
		capitalGainsProfitAndLoss: parseFloat(att["capitalGainsPnl"]),
		forexProfitAndLoss: parseFloat(att["fxPnl"]),
		buyOrSell: att["buySell"] as BuyOrSell,
		transactionID: att["transactionID"],
		openDateTime: safeDateParse(att["openDateTime"]),
		holdingPeriodDateTime: safeDateParse(att["holdingPeriodDateTime"]),
		levelOfDetail: att["levelOfDetail"] as LevelOfDetail,
	};
}

function extractOptionTrade(att: Record<string, string>): TradeDerivative {
	return {
		clientAccountID: att["accountId"],
		currency: att["currency"],
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		underlyingConid: att["underlyingConid"],
		underlyingSymbol: att["underlyingSymbol"],
		underlyingSecurityID: att["underlyingSecurityID"],
		underlyingListingExchange: att["underlyingListingExchange"],
		tradeID: att["tradeID"],
		multiplier: parseFloat(att["multiplier"]),
		strike: parseFloat(att["strike"]),
		reportDate: safeDateParse(att["reportDate"]),
		expiry: safeDateParse(att["expiry"]),
		dateTime: safeDateParse(att["dateTime"]),
		putOrCall: att["putCall"] as PutOrCall,
		tradeDate: safeDateParse(att["tradeDate"]),
		settleDateTarget: safeDateParse(att["settleDateTarget"]),
		transactionType: att["transactionType"] as TransactionType,
		exchange: att["exchange"],
		quantity: parseFloat(att["quantity"]),
		tradePrice: parseFloat(att["tradePrice"]),
		tradeMoney: parseFloat(att["tradeMoney"]),
		proceeds: parseFloat(att["proceeds"]),
		taxes: parseFloat(att["taxes"]),
		ibCommission: parseFloat(att["ibCommission"]),
		ibCommissionCurrency: att["ibCommissionCurrency"],
		netCash: parseFloat(att["netCash"]),
		netCashInBase: parseFloat(att["netCashInBase"]),
		closePrice: parseFloat(att["closePrice"]),
		openCloseIndicator: att["openCloseIndicator"] as OpenCloseIndicator,
		notesAndCodes: parseNotes(att["notes"] ?? ""),
		costBasis: parseFloat(att["cost"]),
		fifoProfitAndLossRealized: parseFloat(att["fifoPnlRealized"]),
		capitalGainsProfitAndLoss: parseFloat(att["capitalGainsPnl"]),
		forexProfitAndLoss: parseFloat(att["fxPnl"]),
		marketToMarketProfitAndLoss: floatValueOrNull(att["mtmPnl"] ?? ""),
		buyOrSell: att["buySell"] as BuyOrSell,
		transactionID: att["transactionID"],
		orderTime: safeDateParse(att["orderTime"]),
		levelOfDetail: att["levelOfDetail"] as LevelOfDetail,
		orderType: att["orderType"] as OrderType,
	};
}

function extractOptionLot(att: Record<string, string>): LotDerivative {
	return {
		clientAccountID: att["accountId"],
		currency: att["currency"],
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		underlyingConid: att["underlyingConid"],
		underlyingSymbol: att["underlyingSymbol"],
		underlyingSecurityID: att["underlyingSecurityID"],
		underlyingListingExchange: att["underlyingListingExchange"],
		multiplier: parseFloat(att["multiplier"]),
		strike: parseFloat(att["strike"]),
		reportDate: safeDateParse(att["reportDate"]),
		expiry: safeDateParse(att["expiry"]),
		dateTime: safeDateParse(att["dateTime"]),
		putOrCall: att["putCall"] as PutOrCall,
		tradeDate: safeDateParse(att["tradeDate"]),
		exchange: att["exchange"],
		quantity: parseFloat(att["quantity"]),
		tradePrice: parseFloat(att["tradePrice"]),
		openCloseIndicator: att["openCloseIndicator"] as OpenCloseIndicator,
		notesAndCodes: parseNotes(att["notes"] ?? ""),
		costBasis: parseFloat(att["cost"]),
		fifoProfitAndLossRealized: parseFloat(att["fifoPnlRealized"]),
		capitalGainsProfitAndLoss: parseFloat(att["capitalGainsPnl"]),
		forexProfitAndLoss: parseFloat(att["fxPnl"]),
		buyOrSell: att["buySell"] as BuyOrSell,
		transactionID: att["transactionID"],
		openDateTime: safeDateParse(att["openDateTime"]),
		holdingPeriodDateTime: safeDateParse(att["holdingPeriodDateTime"]),
		levelOfDetail: att["levelOfDetail"] as LevelOfDetail,
	};
}

function extractCashTransaction(att: Record<string, string>): TransactionCash {
	return {
		clientAccountID: att["accountId"],
		currency: att["currency"],
		fxRateToBase: parseFloat(att["fxRateToBase"]),
		assetClass: att["assetCategory"] as AssetClass,
		subCategory: att["subCategory"] as SubCategory,
		symbol: att["symbol"],
		description: att["description"],
		conid: att["conid"],
		securityID: att["securityID"],
		securityIDType: att["securityIDType"] as SecurityIDType,
		cusip: valueOrNull(att["cusip"] ?? ""),
		isin: att["isin"],
		figi: valueOrNull(att["figi"] ?? ""),
		listingExchange: att["listingExchange"],
		dateTime: safeDateParse(att["dateTime"]),
		settleDate: safeDateParse(att["settleDate"]),
		amount: parseFloat(att["amount"]),
		type: att["type"] as CashTransactionType,
		code: valueOrNull(att["code"] ?? ""),
		transactionID: att["transactionID"],
		reportDate: safeDateParse(att["reportDate"]),
		actionID: att["actionID"],
	};
}

function extractFromStatement(statement: Record<string, unknown>): SegmentedTrades {
	const tradesNode = (statement?.Trades ?? {}) as Record<string, unknown>;
	const allTrades: Record<string, string>[] = toArray(tradesNode.Trade as Record<string, string> | Record<string, string>[]);
	const allLots: Record<string, string>[] = toArray(tradesNode.Lot as Record<string, string> | Record<string, string>[]);

	const stockTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.STOCK).map(extractStockTrade);
	const stockLots = allLots.filter((t) => t["assetCategory"] === AssetClass.STOCK).map(extractStockLot);
	const optionTrades = allTrades.filter((t) => t["assetCategory"] === AssetClass.OPTION).map(extractOptionTrade);
	const optionLots = allLots.filter((t) => t["assetCategory"] === AssetClass.OPTION).map(extractOptionLot);

	const cashNode = statement?.CashTransactions as Record<string, unknown> | undefined;
	const cashTransactionNodes: Record<string, string>[] = toArray(
		cashNode?.CashTransaction as Record<string, string> | Record<string, string>[],
	);
	const cashTransactions = cashTransactionNodes.map(extractCashTransaction);

	const caNode = statement?.CorporateActions as Record<string, unknown> | undefined;
	const corporateActionNodes: Record<string, string>[] = toArray(
		caNode?.CorporateAction as Record<string, string> | Record<string, string>[],
	);
	const corporateActions = corporateActionNodes.map(extractCorporateAction);

	return { cashTransactions, corporateActions, stockTrades, stockLots, derivativeTrades: optionTrades, derivativeLots: optionLots };
}

export function extractFromXML(xmlString: string): SegmentedTrades {
	const doc = parser.parse(xmlString);
	const statementOrStatements = doc?.FlexQueryResponse?.FlexStatements?.FlexStatement;

	const statements: Record<string, unknown>[] = toArray(statementOrStatements);

	if (statements.length === 0) {
		return { cashTransactions: [], corporateActions: [], stockTrades: [], stockLots: [], derivativeTrades: [], derivativeLots: [] };
	}

	const extracted = statements.map(extractFromStatement);
	return mergeTrades(extracted);
}

function deduplicateByTransactionID<T extends { transactionID: string }>(lists: T[][]): T[] {
	const all = lists.flat();
	const map = new Map<string, T>();
	for (const item of all) {
		map.set(item.transactionID, item);
	}
	return Array.from(map.values());
}

export function mergeTrades(trades: SegmentedTrades[]): SegmentedTrades {
	return {
		stockTrades: deduplicateByTransactionID(trades.map((t) => t.stockTrades)),
		stockLots: trades.flatMap((t) => t.stockLots),
		derivativeTrades: deduplicateByTransactionID(trades.map((t) => t.derivativeTrades)),
		derivativeLots: trades.flatMap((t) => t.derivativeLots),
		cashTransactions: deduplicateByTransactionID(trades.map((t) => t.cashTransactions)),
		corporateActions: deduplicateByTransactionID(trades.map((t) => t.corporateActions)),
	};
}
