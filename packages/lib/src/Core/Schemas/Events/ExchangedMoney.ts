import type { CurrencyCode } from "@brrr/Core/Schemas/Identifiers";

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

	public constructor(args: ExchangedMoneyArgs) {
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
