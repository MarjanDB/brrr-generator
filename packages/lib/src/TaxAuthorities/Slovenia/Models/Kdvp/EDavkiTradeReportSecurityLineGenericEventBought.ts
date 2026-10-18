import type { EDavkiTradeReportGainType } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportGainType";
import type { DateTime } from "luxon";

export class EDavkiTradeReportSecurityLineGenericEventBought {
	public readonly boughtOn: DateTime;
	public readonly gainType: EDavkiTradeReportGainType;
	public readonly quantity: number;
	public readonly pricePerUnit: number;
	public readonly pricePerUnitInOriginalCurrency: number;
	public readonly totalPrice: number;
	public readonly totalPriceInOriginalCurrency: number;
	public readonly commissions: number;
	public readonly commissionsInOriginalCurrency: number;
	public readonly inheritanceAndGiftTaxPaid: number | null;
	public readonly baseTaxReduction: number | null;

	public constructor(args: {
		boughtOn: DateTime;
		gainType: EDavkiTradeReportGainType;
		quantity: number;
		pricePerUnit: number;
		pricePerUnitInOriginalCurrency: number;
		totalPrice: number;
		totalPriceInOriginalCurrency: number;
		commissions: number;
		commissionsInOriginalCurrency: number;
		inheritanceAndGiftTaxPaid: number | null;
		baseTaxReduction: number | null;
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
		this.inheritanceAndGiftTaxPaid = args.inheritanceAndGiftTaxPaid;
		this.baseTaxReduction = args.baseTaxReduction;
	}
}
