export enum GenericAssetClass {
	STOCK = "STOCK",
	OPTION = "OPTION",
	CASH_AND_CASH_EQUIVALENTS = "CASH_AND_CASH_EQUIVALENTS",
	BOND = "BOND",
}

export enum GenericCategory {
	REGULAR = "REGULAR",
	TRUST_FUND = "TRUST_FUND",
}

export enum GenericShortLong {
	SHORT = "SHORT",
	LONG = "LONG",
}

// Names here are just guesses, since I don't know what these correspond to in English
export enum GenericTradeReportItemType {
	STOCK = "STOCK",
	OPTION = "OPTION",
	STOCK_SHORT = "STOCK_SHORT",
	STOCK_CONTRACT = "STOCK_CONTRACT",
	STOCK_CONTRACT_SHORT = "STOCK_CONTRACT_SHORT",
	COMPANY_SHARE = "COMPANY_SHARE",
	PLVPZOK = "PLVPZOK",
}

export enum GenericTradeReportItemGainType {
	CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT",
	BOUGHT = "BOUGHT",
	CAPITAL_RAISE = "CAPITAL_RAISE",
	CAPITAL_ASSET = "CAPITAL_ASSET",
	CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE",
	INHERITENCE = "INHERITENCE",
	GIFT = "GIFT",
	OTHER = "OTHER",
	RIGHT_TO_NEWLY_ISSUED_STOCK = "RIGHT_TO_NEWLY_ISSUED_STOCK",
}

export enum GenericDerivativeReportItemType {
	DERIVATIVE = "DERIVATIVE",
	DERIVATIVE_SHORT = "DERIVATIVE_SHORT",
}

export enum GenericDerivativeReportAssetClassType {
	FUTURES_CONTRACT = "FUTURES_CONTRACT",
	CONTRACT_FOR_DIFFERENCE = "CFD",
	OPTION = "OPTION",
	CERTIFICATE = "CERTIFICATE",
	OTHER = "OTHER",
}

export enum GenericDerivativeReportItemGainType {
	CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT",
	BOUGHT = "BOUGHT",
	CAPITAL_RAISE = "CAPITAL_RAISE",
	CAPITAL_ASSET = "CAPITAL_ASSET",
	CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE",
	INHERITENCE = "INHERITENCE",
	GIFT = "GIFT",
	OTHER = "OTHER",
}

export class GenericMonetaryExchangeInformation {
	public readonly underlyingCurrency: string;
	public readonly underlyingQuantity: number;
	public readonly underlyingTradePrice: number;
	public readonly comissionCurrency: string;
	public readonly comissionTotal: number;
	public readonly taxCurrency: string;
	public readonly taxTotal: number;
	public readonly fxRateToBase: number;

	constructor(args: {
		underlyingCurrency: string;
		underlyingQuantity: number;
		underlyingTradePrice: number;
		comissionCurrency: string;
		comissionTotal: number;
		taxCurrency: string;
		taxTotal: number;
		fxRateToBase: number;
	}) {
		this.underlyingCurrency = args.underlyingCurrency;
		this.underlyingQuantity = args.underlyingQuantity;
		this.underlyingTradePrice = args.underlyingTradePrice;
		this.comissionCurrency = args.comissionCurrency;
		this.comissionTotal = args.comissionTotal;
		this.taxCurrency = args.taxCurrency;
		this.taxTotal = args.taxTotal;
		this.fxRateToBase = args.fxRateToBase;
	}
}

// https://www.racunovodstvo.net/zakonodaja/zdoh/90-clen
export enum GenericDividendType {
	UNKNOWN = "",
	ORDINARY = "1",
	CONSTRUCTIVE = "2",
	LIQUIDATING = "3",
	OTHER = "4",
	OTHER_2 = "5",
	BONUS = "6",
}
