import type { CurrencyCode } from "@brrr/Core/Schemas/Identifiers";
// ISO 10962 CFI categories (the code's first letter; TC is category T, group C).
export enum GenericAssetClass {
	STOCK = "STOCK", // E
	OPTION = "OPTION", // O
	CASH_AND_CASH_EQUIVALENTS = "CASH_AND_CASH_EQUIVALENTS", // TC
	BOND = "BOND", // D
}

// ISO 10962 CFI categories.
export enum GenericCategory {
	REGULAR = "REGULAR", // E
	TRUST_FUND = "TRUST_FUND", // C
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
	underlyingCurrency: CurrencyCode;
	underlyingQuantity: number;
	underlyingTradePrice: number;
	commissionCurrency: CurrencyCode;
	commissionTotal: number;
	taxCurrency: CurrencyCode;
	taxTotal: number;
	fxRateToBase: number;
};

export class GenericMonetaryExchangeInformation {
	public readonly underlyingCurrency: CurrencyCode;
	public readonly underlyingQuantity: number;
	public readonly underlyingTradePrice: number;
	public readonly commissionCurrency: CurrencyCode;
	public readonly commissionTotal: number;
	public readonly taxCurrency: CurrencyCode;
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
