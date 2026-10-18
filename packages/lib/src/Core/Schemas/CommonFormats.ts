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

export enum AcquisitionMethod {
	BOUGHT = "BOUGHT",
	GIFT = "GIFT",
	INHERITANCE = "INHERITANCE",
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

// ISO 15022/20022 corporate action event codes (CAEV), with the dividend type qualifier where it
// tells them apart.
export enum DividendType {
	UNKNOWN = "UNKNOWN",
	ORDINARY = "ORDINARY", // DVCA, DIVI//REGR
	BONUS = "BONUS", // DVCA, DIVI//SPEC
	LIQUIDATING = "LIQUIDATING", // LIQU
	OTHER = "OTHER",
}
