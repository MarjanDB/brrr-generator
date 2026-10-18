import type { DateTime } from "luxon";

export class EDavkiDerivativeReportSecurityLineGenericEventSold {
	public readonly soldOn: DateTime;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly leveraged: boolean;

	public constructor(args: {
		soldOn: DateTime;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		leveraged: boolean;
	}) {
		this.soldOn = args.soldOn;
		this.quantity = args.quantity;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.leveraged = args.leveraged;
	}
}
