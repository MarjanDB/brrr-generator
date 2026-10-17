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

export enum GenericTradeReportItemGainType {
	CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT",
	BOUGHT = "BOUGHT",
	CAPITAL_RAISE = "CAPITAL_RAISE",
	CAPITAL_ASSET = "CAPITAL_ASSET",
	CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE",
	INHERITANCE = "INHERITANCE",
	GIFT = "GIFT",
	OTHER = "OTHER",
	RIGHT_TO_NEWLY_ISSUED_STOCK = "RIGHT_TO_NEWLY_ISSUED_STOCK",
}

export enum GenericDerivativeReportItemGainType {
	CAPITAL_INVESTMENT = "CAPITAL_INVESTMENT",
	BOUGHT = "BOUGHT",
	CAPITAL_RAISE = "CAPITAL_RAISE",
	CAPITAL_ASSET = "CAPITAL_ASSET",
	CAPITALIZATION_CHANGE = "CAPITALIZATION_CHANGE",
	INHERITANCE = "INHERITANCE",
	GIFT = "GIFT",
	OTHER = "OTHER",
}

type GenericMonetaryExchangeInformationArgs = {
	underlyingCurrency: string;
	underlyingQuantity: number;
	underlyingTradePrice: number;
	commissionCurrency: string;
	commissionTotal: number;
	taxCurrency: string;
	taxTotal: number;
	fxRateToBase: number;
};

export class GenericMonetaryExchangeInformation {
	public readonly underlyingCurrency: string;
	public readonly underlyingQuantity: number;
	public readonly underlyingTradePrice: number;
	public readonly commissionCurrency: string;
	public readonly commissionTotal: number;
	public readonly taxCurrency: string;
	public readonly taxTotal: number;
	public readonly fxRateToBase: number;

	constructor(args: GenericMonetaryExchangeInformationArgs) {
		this.underlyingCurrency = args.underlyingCurrency;
		this.underlyingQuantity = args.underlyingQuantity;
		this.underlyingTradePrice = args.underlyingTradePrice;
		this.commissionCurrency = args.commissionCurrency;
		this.commissionTotal = args.commissionTotal;
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
