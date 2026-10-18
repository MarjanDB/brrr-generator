import type { DateTime } from "luxon";

export class EDavkiTradeReportSecurityLineGenericEventSold {
	public readonly soldOn: DateTime;
	public readonly quantity: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly satisfiesTaxBasisReduction: boolean;

	public constructor(args: {
		soldOn: DateTime;
		quantity: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		satisfiesTaxBasisReduction: boolean;
	}) {
		this.soldOn = args.soldOn;
		this.quantity = args.quantity;
		this.totalPrice = args.totalPrice;
		this.totalPriceInOriginalCurrency = args.totalPriceInOriginalCurrency;
		this.pricePerUnit = args.pricePerUnit;
		this.pricePerUnitInOriginalCurrency = args.pricePerUnitInOriginalCurrency;
		this.commissions = args.commissions;
		this.commissionsInOriginalCurrency = args.commissionsInOriginalCurrency;
		this.satisfiesTaxBasisReduction = args.satisfiesTaxBasisReduction;
	}
}
