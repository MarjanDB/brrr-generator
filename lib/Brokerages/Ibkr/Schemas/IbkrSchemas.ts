import type { DateTime } from "luxon";

export enum AssetClass {
	STOCK = "STK",
	CASH = "CASH",
	OPTION = "OPT",
}

export enum SubCategory {
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

export enum OpenCloseIndicator {
	OPEN = "O",
	CLOSE = "C",
	NOT_SPECIFIED = "",
}

export enum TransactionType {
	EXCHANGE_TRADE = "ExchTrade",
}

export enum SecurityIDType {
	ISIN = "ISIN",
}

export enum BuyOrSell {
	BUY = "BUY",
	SELL = "SELL",
}

export enum PutOrCall {
	PUT = "P",
	CALL = "C",
}

export enum Codes {
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

export enum LevelOfDetail {
	EXECUTION = "EXECUTION",
	DETAIL = "DETAIL",
	CLOSED_LOT = "CLOSED_LOT",
}

export enum OrderType {
	LIMIT = "LMT",
	MARKET = "MKT",
	MID_POINT = "MIDPX",
	STOP = "STP",
	STOP_LIMIT = "STPLMT",
}

export enum Model {
	INDEPENDENT = "Independent",
}

export enum CashTransactionType {
	WITHHOLDING_TAX = "Withholding Tax",
	DIVIDEND = "Dividends",
	PAYMENT_IN_LIEU_OF_DIVIDENDS = "Payment In Lieu Of Dividends",
}

export type TradeStock = {
	clientAccountID: string;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	securityID: string;
	securityIDType: SecurityIDType;
	cusip: string | null;
	isin: string;
	figi: string | null;
	listingExchange: string;
	reportDate: DateTime;
	dateTime: DateTime;
	tradeDate: DateTime;
	transactionType: TransactionType;
	exchange: string;
	quantity: number;
	tradePrice: number;
	tradeMoney: number;
	proceeds: number;
	taxes: number;
	ibCommission: number;
	ibCommissionCurrency: string;
	netCash: number;
	netCashInBase: number | null;
	closePrice: number;
	openCloseIndicator: OpenCloseIndicator;
	notesAndCodes: Codes[];
	costBasis: number;
	fifoProfitAndLossRealized: number;
	capitalGainsProfitAndLoss: number | null;
	forexProfitAndLoss: number | null;
	marketToMarketProfitAndLoss: number | null;
	buyOrSell: BuyOrSell;
	transactionID: string;
	orderTime: DateTime;
	levelOfDetail: LevelOfDetail;
	changeInPrice: number;
	changeInQuantity: number;
	orderType: OrderType;
	accruedInterest: number;
};

export type LotStock = {
	clientAccountID: string;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	securityID: string;
	securityIDType: SecurityIDType;
	cusip: string | null;
	isin: string;
	figi: string | null;
	listingExchange: string;
	multiplier: number;
	reportDate: DateTime;
	dateTime: DateTime;
	tradeDate: DateTime;
	exchange: string;
	quantity: number;
	tradePrice: number;
	openCloseIndicator: OpenCloseIndicator;
	notesAndCodes: Codes[];
	costBasis: number;
	fifoProfitAndLossRealized: number;
	capitalGainsProfitAndLoss: number;
	forexProfitAndLoss: number;
	buyOrSell: BuyOrSell;
	transactionID: string;
	openDateTime: DateTime;
	holdingPeriodDateTime: DateTime;
	levelOfDetail: LevelOfDetail;
};

export type TradeDerivative = {
	clientAccountID: string;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	figi: string | null;
	listingExchange: string;
	underlyingConid: string;
	underlyingSymbol: string;
	underlyingSecurityID: string;
	underlyingListingExchange: string;
	tradeID: string;
	multiplier: number;
	strike: number;
	reportDate: DateTime;
	expiry: DateTime;
	dateTime: DateTime;
	putOrCall: PutOrCall;
	tradeDate: DateTime;
	settleDateTarget: DateTime;
	transactionType: TransactionType;
	exchange: string;
	quantity: number;
	tradePrice: number;
	tradeMoney: number;
	proceeds: number;
	taxes: number;
	ibCommission: number;
	ibCommissionCurrency: string;
	netCash: number;
	netCashInBase: number;
	closePrice: number;
	openCloseIndicator: OpenCloseIndicator;
	notesAndCodes: Codes[];
	costBasis: number;
	fifoProfitAndLossRealized: number;
	capitalGainsProfitAndLoss: number;
	forexProfitAndLoss: number;
	marketToMarketProfitAndLoss: number | null;
	buyOrSell: BuyOrSell;
	transactionID: string;
	orderTime: DateTime;
	levelOfDetail: LevelOfDetail;
	orderType: OrderType;
};

export type LotDerivative = {
	clientAccountID: string;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	figi: string | null;
	listingExchange: string;
	underlyingConid: string;
	underlyingSymbol: string;
	underlyingSecurityID: string;
	underlyingListingExchange: string;
	multiplier: number;
	strike: number;
	reportDate: DateTime;
	expiry: DateTime;
	dateTime: DateTime;
	putOrCall: PutOrCall;
	tradeDate: DateTime;
	exchange: string;
	quantity: number;
	tradePrice: number;
	openCloseIndicator: OpenCloseIndicator;
	notesAndCodes: Codes[];
	costBasis: number;
	fifoProfitAndLossRealized: number;
	capitalGainsProfitAndLoss: number;
	forexProfitAndLoss: number;
	buyOrSell: BuyOrSell;
	transactionID: string;
	openDateTime: DateTime;
	holdingPeriodDateTime: DateTime;
	levelOfDetail: LevelOfDetail;
};

export type CorporateAction = {
	clientAccountID: string;
	accountAlias: string | null;
	model: Model | null;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	securityID: string;
	securityIDType: SecurityIDType;
	cusip: string | null;
	isin: string;
	figi: string | null;
	listingExchange: string;
	underlyingConid: string | null;
	underlyingSymbol: string | null;
	underlyingSecurityID: string | null;
	underlyingListingExchange: string | null;
	multiplier: number;
	strike: number | null;
	expiry: DateTime | null;
	putOrCall: PutOrCall | null;
	principalAdjustFactor: number | null;
	reportDate: DateTime;
	dateTime: DateTime;
	actionDescription: string;
	amount: number;
	proceeds: number;
	value: number;
	quantity: number;
	fifoProfitAndLossRealized: number;
	capitalGainsProfitAndLoss: number;
	forexProfitAndLoss: number;
	marketToMarketProfitAndLoss: number | null;
	notesAndCodes: Codes[];
	type: string;
	transactionID: string;
	actionID: string;
	levelOfDetail: LevelOfDetail;
	serialNumber: string | null;
	deliveryType: string | null;
	commodityType: string | null;
	fineness: number;
	weight: number;
};

export type TransactionCash = {
	clientAccountID: string;
	currency: string;
	fxRateToBase: number;
	assetClass: AssetClass;
	subCategory: SubCategory;
	symbol: string;
	description: string;
	conid: string;
	securityID: string;
	securityIDType: SecurityIDType;
	cusip: string | null;
	isin: string;
	figi: string | null;
	listingExchange: string;
	dateTime: DateTime;
	settleDate: DateTime;
	amount: number;
	type: CashTransactionType;
	code: string | null;
	transactionID: string;
	reportDate: DateTime;
	actionID: string;
};
