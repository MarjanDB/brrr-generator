import type { CurrencyCode } from "@brrr/Core/Schemas/Identifiers";
// ISO 10962 CFI categories (the code's first letter; TC is category T, group C).
export enum AssetClass {
	STOCK = "STOCK", // E
	OPTION = "OPTION", // O
	CASH_AND_CASH_EQUIVALENTS = "CASH_AND_CASH_EQUIVALENTS", // TC
	BOND = "BOND", // D
}

// ISO 10962 CFI categories.
export enum Category {
	REGULAR = "REGULAR", // E
	TRUST_FUND = "TRUST_FUND", // C
}

export enum ShortLong {
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

type ExchangedMoneyArgs = {
	currency: CurrencyCode;
	quantity: number;
	priceInBase: number;
	commissionCurrency: CurrencyCode;
	commissionInBase: number;
	taxCurrency: CurrencyCode;
	taxTotal: number;
	fxRateToBase: number;
};

export class ExchangedMoney {
	public readonly currency: CurrencyCode;
	public readonly quantity: number;
	public readonly priceInBase: number;
	public readonly commissionCurrency: CurrencyCode;
	public readonly commissionInBase: number;
	// Passed through from the broker unchanged. We don't know how IBKR classifies trade taxes (which
	// currency, which sign): no export we've seen has a non-zero one.
	public readonly taxCurrency: CurrencyCode;
	public readonly taxTotal: number;
	public readonly fxRateToBase: number;

	constructor(args: ExchangedMoneyArgs) {
		this.currency = args.currency;
		this.quantity = args.quantity;
		this.priceInBase = args.priceInBase;
		this.commissionCurrency = args.commissionCurrency;
		this.commissionInBase = args.commissionInBase;
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
