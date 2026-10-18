import type { EDavkiCountryCode } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import type { EDavkiTradeReportSecurityLineEvent } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineEvent";
import type { EDavkiTradeSecurityType } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeSecurityType";

export class EDavkiGenericTradeReportItem {
	public readonly itemId: string | null;
	public readonly inventoryListType: EDavkiTradeSecurityType;
	public readonly name: string | null;
	public readonly hasForeignTax: boolean;
	public readonly foreignTax: number | null;
	public readonly ftCountryId: EDavkiCountryCode | null;
	public readonly ftCountryName: string | null;
	public readonly hasLossTransfer: boolean | null;
	public readonly foreignTransfer: boolean | null;
	public readonly taxDecreaseConformance: boolean | null;
	public readonly items: EDavkiTradeReportSecurityLineEvent[];

	public constructor(args: {
		itemId: string | null;
		inventoryListType: EDavkiTradeSecurityType;
		name: string | null;
		hasForeignTax: boolean;
		foreignTax: number | null;
		ftCountryId: EDavkiCountryCode | null;
		ftCountryName: string | null;
		hasLossTransfer: boolean | null;
		foreignTransfer: boolean | null;
		taxDecreaseConformance: boolean | null;
		items: EDavkiTradeReportSecurityLineEvent[];
	}) {
		this.itemId = args.itemId;
		this.inventoryListType = args.inventoryListType;
		this.name = args.name;
		this.hasForeignTax = args.hasForeignTax;
		this.foreignTax = args.foreignTax;
		this.ftCountryId = args.ftCountryId;
		this.ftCountryName = args.ftCountryName;
		this.hasLossTransfer = args.hasLossTransfer;
		this.foreignTransfer = args.foreignTransfer;
		this.taxDecreaseConformance = args.taxDecreaseConformance;
		this.items = args.items;
	}
}
