import type { EDavkiDerivativeReportGainType } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportGainType";
import type { DateTime } from "luxon";

export class EDavkiDerivativeReportSecurityLineGenericEventBought {
	public readonly boughtOn: DateTime;
	public readonly gainType: EDavkiDerivativeReportGainType;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly leveraged: boolean;

	public constructor(args: {
		boughtOn: DateTime;
		gainType: EDavkiDerivativeReportGainType;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		leveraged: boolean;
	}) {
		this.boughtOn = args.boughtOn;
		this.gainType = args.gainType;
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
